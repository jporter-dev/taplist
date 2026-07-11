#!/usr/bin/env node
// Scrapes venue taplists defined in config.yml and POSTs them to the worker.
//
// Usage:
//   node scraper/index.js                 scrape all venues and POST
//   node scraper/index.js --dry-run       scrape and print JSON, no POST
//   node scraper/index.js --site "Name"   scrape a single venue
//   node scraper/index.js --out file.json also write the result to a file
//
// Env: TAPLIST_API (default https://taplist.jporter.dev), SCRAPER_TOKEN

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import * as cheerio from "cheerio";
import yaml from "js-yaml";
import pLimit from "p-limit";
import * as filters from "./filters.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 30000;
const BROWSER_TIMEOUT_MS = 45000;
const CONCURRENCY = 4;

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    site: { type: "string" },
    out: { type: "string" },
  },
});

const config = yaml.load(
  fs.readFileSync(path.join(__dirname, "config.yml"), "utf8")
);

let browserPromise = null;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = import("playwright").then(({ chromium }) =>
      chromium.launch()
    );
  }
  return browserPromise;
}

function extractWithCheerio($, site) {
  return $(site.selector)
    .toArray()
    .map((el) => {
      if (site.beerSelector && site.brewerySelector) {
        const brewery = $(el).find(site.brewerySelector).first().text().trim();
        const beer = $(el).find(site.beerSelector).first().text().trim();
        if (!beer) return "";
        return `${brewery} ${beer}`.trim();
      }
      return $(el).text().trim();
    })
    .filter(Boolean);
}

async function scrapeJson(site) {
  const response = await fetch(site.url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const list = site.listKey
    .split(".")
    .reduce((obj, key) => obj?.[key], data);
  if (!Array.isArray(list)) throw new Error(`listKey "${site.listKey}" is not an array`);
  return list.map((item) =>
    site.fields.map((f) => `${item[f] ?? ""}`.trim()).filter(Boolean).join(" ")
  );
}

async function scrapeFetch(site) {
  const response = await fetch(site.url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const $ = cheerio.load(await response.text());
  return extractWithCheerio($, site);
}

async function scrapeBrowser(site) {
  const browser = await getBrowser();
  const context = await browser.newContext({ userAgent: USER_AGENT });
  try {
    const page = await context.newPage();
    await page.goto(site.url, {
      waitUntil: "domcontentloaded",
      timeout: BROWSER_TIMEOUT_MS,
    });
    await page.waitForSelector(site.selector, { timeout: BROWSER_TIMEOUT_MS });
    return await page.evaluate((s) => {
      return Array.from(document.querySelectorAll(s.selector))
        .map((el) => {
          if (s.beerSelector && s.brewerySelector) {
            const brewery = el.querySelector(s.brewerySelector);
            const beer = el.querySelector(s.beerSelector);
            if (!beer) return "";
            return `${brewery ? brewery.innerText.trim() : ""} ${beer.innerText.trim()}`.trim();
          }
          return el.innerText.trim();
        })
        .filter(Boolean);
    }, site);
  } finally {
    await context.close();
  }
}

function normalize(rawBeers, site) {
  const namefilter = site.namefilter ? filters[site.namefilter] : null;
  if (site.namefilter && !namefilter) {
    throw new Error(`Unknown namefilter "${site.namefilter}"`);
  }
  const seen = new Set();
  const beers = [];
  for (let name of rawBeers) {
    name = name.replace(/\s+/g, " ").trim();
    if (namefilter) name = namefilter(name);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    beers.push({
      id: `${name.replace(/[^A-Z0-9]/gi, "_")}-${site.name.replace(/[^A-Z0-9]/gi, "_")}`,
      name,
      location: site.name,
    });
  }
  return beers;
}

async function scrapeSite(site) {
  const scrapers = { json: scrapeJson, browser: scrapeBrowser, fetch: scrapeFetch };
  const raw = await scrapers[site.mode ?? "fetch"](site);
  const beers = normalize(raw, site);
  if (beers.length === 0) throw new Error("no beers found (selector rot?)");
  return { url: site.url, last_updated: Date.now(), beers };
}

async function postTaplist(venues) {
  const api = process.env.TAPLIST_API ?? "https://taplist.jporter.dev";
  const token = process.env.SCRAPER_TOKEN;
  if (!token) throw new Error("SCRAPER_TOKEN is not set");
  const response = await fetch(`${api}/api/taplist`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ venues }),
  });
  if (!response.ok) {
    throw new Error(`POST failed: HTTP ${response.status} ${await response.text()}`);
  }
}

async function main() {
  let sites = config.sites;
  if (args.site) {
    sites = sites.filter((s) => s.name === args.site);
    if (sites.length === 0) {
      console.error(`No site named "${args.site}" in config.yml`);
      process.exit(1);
    }
  }

  const limit = pLimit(CONCURRENCY);
  const results = await Promise.allSettled(
    sites.map((site) =>
      limit(async () => {
        console.log(`Scraping ${site.name}...`);
        const venue = await scrapeSite(site);
        console.log(`  ${site.name}: ${venue.beers.length} beers`);
        return { name: site.name, venue };
      })
    )
  );

  if (browserPromise) await (await browserPromise).close();

  const venues = {};
  const failures = [];
  for (const [i, result] of results.entries()) {
    if (result.status === "fulfilled") {
      venues[result.value.name] = result.value.venue;
    } else {
      failures.push(`${sites[i].name}: ${result.reason?.message ?? result.reason}`);
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} venue(s) failed:`);
    for (const failure of failures) console.error(`  ${failure}`);
  }
  const succeeded = Object.keys(venues).length;
  console.log(`\n${succeeded}/${sites.length} venues scraped.`);
  if (succeeded === 0) process.exit(1);

  const output = JSON.stringify({ venues }, null, 2);
  if (args.out) fs.writeFileSync(args.out, output);
  if (args["dry-run"]) {
    console.log(output);
    return;
  }
  await postTaplist(venues);
  console.log("Posted to worker.");
}

await main();
