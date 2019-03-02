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

  beers = await beers.map(beer => {
    beer = beer.replace(/\s+/g, " ");
    // process with namefilter if exists
    if (site.hasOwnProperty("namefilter")) {
      beer = site.namefilter(beer);
    }
    return getCheckins(beer).then(checkins => {
      return {
        name: beer,
        location: site.name,
        checkins: checkins
      };
    });
  });
  return Promise.all(beers);
}

function getCheckins(q) {
  return beerIndex
    .search({
      query: q,
      attributesToRetrieve: ["recentCheckin"],
      hitsPerPage: 1,
      facets: ["username"]
    })
    .then(content => {
      if (content.facets.username) return Object.keys(content.facets.username);
      else return [];
    });
}

function arrayToObject(array, keyField) {
  return array.reduce((obj, item) => {
    obj[item[keyField]] = item;
    return obj;
  }, {});
}

function main() {
  // Get document, or throw exception on error
  try {
    let db = [];
    void (async () => {
      let promises = CONFIG.sites.map(site => {
        return new Promise(resolve => {
          parseSite(site)
            .then(beers => {
              console.log(beers);
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
            last_updated: Date.now(),
            users: arrayToObject(CONFIG.users, "username")
          })
        )
      );
    })();
  } catch (e) {
    console.log(e);
  }
}

main();
