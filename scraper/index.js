#!/usr/bin/env node
// Scrapes venue taplists defined in config.yml and POSTs them to the worker.
//
// Usage:
//   node scraper/index.js                 scrape all venues, enrich, and POST
//   node scraper/index.js --dry-run       scrape and print JSON, no enrich/POST
//   node scraper/index.js --site "Name"   scrape a single venue
//   node scraper/index.js --out file.json also write the result to a file
//
// Full runs enrich each beer with Untappd data (rating, style, ABV) via the
// worker's /api/beer endpoint before POSTing; dry runs stay offline.
//
// Env: TAPLIST_API (default https://taplist.prtr.dev), SCRAPER_TOKEN

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
const DEFAULT_API = "https://taplist.prtr.dev";
// Untappd allows ~100 calls/hour and each cache miss costs 2 (search + info).
// Beers over budget stay unenriched and get picked up on a later run.
const ENRICH_MISS_BUDGET = 40;
// ~5 consecutive failed scrapes at the 5h cron cadence. Selector rot, not a blip.
const STALE_ALERT_HOURS = 24;

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
  let scope = $.root();
  if (site.section) {
    const re = new RegExp(site.section.match, "i");
    const roots = $(site.section.selector)
      .toArray()
      .filter((el) => re.test($(el).find(site.section.header).first().text()));
    if (roots.length === 0) throw new Error("no menu sections matched");
    scope = $(roots);
  }
  return scope
    .find(site.selector)
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
  let list = site.listKey
    .split(".")
    .reduce((obj, key) => obj?.[key], data);
  if (!Array.isArray(list)) throw new Error(`listKey "${site.listKey}" is not an array`);
  if (site.where) {
    list = list.filter((item) =>
      Object.entries(site.where).every(([field, value]) => item[field] === value)
    );
  }
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
      let scopes = [document];
      if (s.section) {
        const re = new RegExp(s.section.match, "i");
        scopes = Array.from(document.querySelectorAll(s.section.selector)).filter(
          (el) => re.test(el.querySelector(s.section.header)?.innerText ?? "")
        );
        if (scopes.length === 0) throw new Error("no menu sections matched");
      }
      return scopes
        .flatMap((scope) => Array.from(scope.querySelectorAll(s.selector)))
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
  if (site.stopAt) {
    const re = new RegExp(site.stopAt, "i");
    const stop = rawBeers.findIndex((name) => re.test(name));
    if (stop >= 0) rawBeers = rawBeers.slice(0, stop);
  }
  const seen = new Set();
  const beers = [];
  for (let name of rawBeers) {
    // Menus use asterisks as footnote markers (happy hour, to-go, etc).
    name = name
      .replace(/\s+/g, " ")
      .replace(/^\*+\s*|\s*\*+$/g, "")
      .trim();
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

async function enrichVenues(venues) {
  const api = process.env.TAPLIST_API ?? DEFAULT_API;
  const token = process.env.SCRAPER_TOKEN;
  let hits = 0;
  let misses = 0;
  let unmatched = 0;
  let skipped = 0;
  let authed = null;
  const errors = {}; // status or error name -> count
  for (const venue of Object.values(venues)) {
    for (const beer of venue.beers) {
      if (misses >= ENRICH_MISS_BUDGET) {
        skipped++;
        continue;
      }
      // A stream of 429s (worker treating us as anonymous) or 502s
      // (Untappd hourly quota gone) won't recover within the run;
      // stop hammering and let the next run continue.
      if ((errors[429] ?? 0) >= 10 || (errors[502] ?? 0) >= 10) {
        skipped++;
        continue;
      }
      try {
        const response = await fetch(
          `${api}/api/beer?q=${encodeURIComponent(beer.name)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          }
        );
        authed ??= response.headers.get("X-Authed");
        if (response.headers.get("X-Cache") === "miss") misses++;
        else hits++;
        if (response.status === 404) {
          unmatched++;
          continue;
        }
        if (!response.ok) {
          errors[response.status] = (errors[response.status] ?? 0) + 1;
          skipped++;
          continue;
        }
        const b = await response.json();
        beer.untappd = {
          bid: b.bid,
          rating: b.rating_score,
          checkins: b.stats?.user_count ?? 0,
          style: b.beer_style,
          abv: b.beer_abv,
          label: b.beer_label,
          brewery: b.brewery?.brewery_name,
        };
      } catch (error) {
        errors[error.name ?? "error"] = (errors[error.name ?? "error"] ?? 0) + 1;
        skipped++;
      }
    }
  }
  const errorNote = Object.entries(errors)
    .map(([k, v]) => `${k}x${v}`)
    .join(" ");
  const summary =
    `Enriched: ${hits} cached, ${misses} looked up, ${unmatched} unmatched, ` +
    `${skipped} skipped (authed=${authed}${errorNote ? `, errors: ${errorNote}` : ""})`;
  console.log(summary);
  writeStepSummary([`### Enrichment`, summary]);
  if (token && authed === "false") {
    console.error(
      "SCRAPER_TOKEN was sent but the worker rejected it; enrichment ran rate-limited."
    );
  }
}

// Venues whose stored data is old failed several scrapes in a row.
async function findStaleVenues(siteNames) {
  const api = process.env.TAPLIST_API ?? DEFAULT_API;
  const response = await fetch(`${api}/api/taplist`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) return [];
  const data = await response.json();
  const cutoff = Date.now() - STALE_ALERT_HOURS * 60 * 60 * 1000;
  return siteNames.filter((name) => {
    const venue = data.venues?.[name];
    return venue && venue.last_updated < cutoff;
  });
}

// Surfaces failures in the Actions run page without digging through logs.
function writeStepSummary(lines) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file || lines.length === 0) return;
  fs.appendFileSync(file, lines.join("\n") + "\n");
}

async function postTaplist(venues) {
  const api = process.env.TAPLIST_API ?? DEFAULT_API;
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
    writeStepSummary([
      "### Scrape failures",
      ...failures.map((f) => `- ${f}`),
    ]);
  }
  const succeeded = Object.keys(venues).length;
  console.log(`\n${succeeded}/${sites.length} venues scraped.`);
  if (succeeded === 0) process.exit(1);

  if (!args["dry-run"]) await enrichVenues(venues);

  const output = JSON.stringify({ venues }, null, 2);
  if (args.out) fs.writeFileSync(args.out, output);
  if (args["dry-run"]) {
    console.log(output);
    return;
  }
  await postTaplist(venues);
  console.log("Posted to worker.");

  // Fail the run (after posting) when a venue has missed several scrapes,
  // so selector rot shows up as a red Action instead of silently old data.
  if (!args.site) {
    const stale = await findStaleVenues(sites.map((s) => s.name));
    if (stale.length > 0) {
      console.error(`\nStale venues (no update in ${STALE_ALERT_HOURS}h):`);
      for (const name of stale) console.error(`  ${name}`);
      writeStepSummary([
        `### Stale venues (no update in ${STALE_ALERT_HOURS}h)`,
        ...stale.map((name) => `- ${name}`),
      ]);
      process.exitCode = 1;
    }
  }
}

await main();
