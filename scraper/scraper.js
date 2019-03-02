#!/usr/bin/env node

const algoliasearch = require("algoliasearch");
const puppeteer = require("puppeteer");
const isWsl = require("is-wsl");
const yaml = require("js-yaml");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

const algoClient = algoliasearch(
  process.env.ALGO_APPID,
  process.env.ALGO_APIKEY
);
const beerIndex = algoClient.initIndex("unique_beers");
const CONFIG = yaml.load(
  fs.readFileSync(path.resolve(__dirname, "config.yml"), "utf8")
);

function main() {
  // Get document, or throw exception on error
  try {
    let db = [];
    void (async () => {
      let promises = CONFIG.sites.map(site => {
        return new Promise(resolve => {
          parseSite(site)
            .then(beers => {
              db = db.concat(beers);
              resolve();
            })
            .catch(e => {
              console.log(`${site.name}\n`, e);
              process.exit(1);
            });
        });
      });
      Promise.all(promises).then(() =>
        fs.writeFileSync(
          path.resolve(__dirname, "../public/taplist.json"),
          JSON.stringify({
            taplist: db,
            last_updated: Date.now()
          })
        )
      );
    })();
  } catch (e) {
    console.log(e);
  }
}

async function parseSite(site) {
  let opts = isWsl
    ? {
        executablePath: "/usr/bin/chromium-browser",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      }
    : {};
  let browser = await puppeteer.launch(opts);
  let page = await browser.newPage();
  await page.goto(site.url);
  await page.waitForSelector(site.selector);
  let beers = await page.evaluate(selector => {
    return Array.from(document.querySelectorAll(selector)).map(beer =>
      beer.innerText.trim()
    );
  }, site.selector);
  await browser.close();

  beers = await beers.map(async beer => {
    beer = beer.replace(/\s+/g, " ");
    // process with namefilter if exists
    if (site.hasOwnProperty("namefilter")) {
      beer = site.namefilter(beer);
    }
    let uniques = await getUniques(beer);
    return {
      name: beer,
      location: site.name,
      uniques: uniques
    };
  });
  return new Promise(resolve => {
    console.log(site.name);
    resolve(beers);
  });
}

function getUniques(q) {
  return new Promise(resolve => {
    beerIndex.search(
      {
        query: q,
        attributesToRetrieve: ["recentCheckin"],
        hitsPerPage: 1,
        facets: ["username"]
      },
      (err, content) => {
        if (err) throw err;

        if (content.facets.username) {
          resolve(Object.keys(content.facets.username));
        } else {
          resolve([]);
        }
      }
    );
  });
}
main();
