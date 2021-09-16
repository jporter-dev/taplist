#!/usr/bin/env node

const puppeteer = require("puppeteer");
const isWsl = require("is-wsl");
const yaml = require("js-yaml");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

dotenv.config();

const CONFIG = yaml.load(
  fs.readFileSync(path.resolve(__dirname, "config.yml"), "utf8")
);

let browser;

async function parseSite(site) {
  console.log(`Parsing ${site.name}`);
  let opts = isWsl
    ? {
        executablePath: "/usr/bin/chromium-browser",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      }
    : {};
  browser = await puppeteer.launch(opts);
  let page = await browser.newPage();
  await page.goto(site.url);

  if (site.name == "Perfect Pour") await page.reload();

  await page.waitForSelector(site.selector);
  let beers = await page.evaluate(site => {
    return Array.from(document.querySelectorAll(site.selector)).map(beer => {
      if (site.beerSelector && site.brewerySelector) {
        return `${beer
          .querySelector(site.brewerySelector)
          .innerText.trim()} ${beer
          .querySelector(site.beerSelector)
          .innerText.trim()}`;
      } else {
        return beer.innerText.trim();
      }
    });
  }, site);
  await browser.close();

  // unique the beers
  beers = [...new Set(beers)];

  beers = await beers
    .map(beer => {
      beer = beer.replace(/\s+/g, " ");
      // process with namefilter if exists
      if (site.hasOwnProperty("namefilter")) {
        beer = site.namefilter(beer);
      }
      if (beer) {
        return {
          id: `${beer.replace(/[^A-Z0-9]/gi, "_")}-${site.name.replace(
            /[^A-Z0-9]/gi,
            "_"
          )}`,
          name: beer,
          location: site.name
        };
      }
    })
    .filter(beer => beer);
  return Promise.all(beers);
}

async function main() {
  // Get document, or throw exception on error
  try {
    let db = [];
    for (const site of CONFIG.sites) {
      await parseSite(site)
        .then(beers => {
          db = db.concat(beers);
          let url = `https://taplist-worker.codecaffeinated.workers.dev/brewery/${
            site.name
          }`;
          let last_updated = Date.now();
          fetch(url, {
            method: "POST",
            body: JSON.stringify({
              last_updated,
              url: site.url,
              beers
            }),
            headers: {
              "Content-type": "application/json; charset=UTF-8"
            }
          });
        })
        .catch(e => {
          browser.close().then(() => {
            console.log(`${site.name} Failed!!! Error below.\n`, e);
          });
        });
    }
  } catch (e) {
    console.log(e);
  }
}

main().then(() => console.log("Done."));
