#!/usr/bin/env node

const puppeteer = require("puppeteer");
const isWsl = require("is-wsl");
const yaml = require("js-yaml");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const getUniques = require("./uniques.js");
const indices = require("./algolia");

dotenv.config();

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
        // return getCheckins(beer).then(checkins => {
        return {
          id: `${beer.replace(/[^A-Z0-9]/gi, "_")}-${site.name.replace(
            /[^A-Z0-9]/gi,
            "_"
          )}`,
          name: beer,
          location: site.name,
          checkins: []
        };
        // });
      }
    })
    .filter(beer => beer);
  return Promise.all(beers);
}

function getCheckins(q) {
  return Promise.all(
    Object.values(indices).map(i => {
      return i.beer
        .search({
          query: q,
          attributesToRetrieve: ["recentCheckin"],
          hitsPerPage: 1,
          facets: ["username"]
        })
        .then(content => {
          if (content.facets.username)
            return Object.keys(content.facets.username).sort((a, b) =>
              a.toLowerCase().localeCompare(b.toLowerCase())
            );
          else return [];
        });
    })
  );
}

function getUniqueCounts() {
  return Promise.all(
    Object.values(indices).map(i => {
      return i.beer
        .search({
          query: "",
          attributesToRetrieve: ["recentCheckin"],
          hitsPerPage: 1,
          facets: ["username"]
        })
        .then(content => {
          return content.facets.username;
        });
    })
  );
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
        return parseSite(site)
          .then(beers => {
            db = db.concat(beers);
          })
          .catch(e => {
            console.log(`${site.name}\n`, e);
            process.exit(1);
          });
      });
      Promise.all(promises).then(() => {
        // getUniqueCounts().then(counts => {
        fs.writeFileSync(
          path.resolve(__dirname, "../src/assets/taplist.json"),
          JSON.stringify({
            taplist: db,
            last_updated: Date.now(),
            users: arrayToObject(CONFIG.users, "username"),
            uniqueCounts: {}
          })
        );
        // });
        // TODO fix this - need new source for storing uniques
        // algolia free tier too limiting...
        // getUniques();
      });
    })();
  } catch (e) {
    console.log(e);
  }
}

main();
