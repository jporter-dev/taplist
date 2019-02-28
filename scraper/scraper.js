#!/usr/bin/env node

const yaml = require("js-yaml");
const puppeteer = require("puppeteer");
const axios = require("axios");
const cheerio = require("cheerio");
const isWsl = require("is-wsl");
const process = require("process");
const path = require("path");
const fs = require("fs");

let USERS;
let data = yaml.load(
  fs.readFileSync(path.resolve(__dirname, "config.yml"), "utf8")
);
USERS = data.users;

function main() {
  // Get document, or throw exception on error
  try {
    let db = [];
    void (async () => {
      let promises = data.sites.map(site => {
        return new Promise(resolve => {
          parseSite(site)
            .then(beers => {
              return getUntapped(beers);
            })
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
          JSON.stringify(db)
        )
      );
    })();
  } catch (e) {
    console.log(e);
  }
}

function getUntapped(beers) {
  let promises = [];
  beers.forEach((beer, idx1) => {
    USERS.forEach((user, idx2) => {
      idx1 += 1;
      idx2 += 1;
      let url = encodeURI(
        `https://untappd.com/user/${user.name}/beers?sort=date&q=${beer.name}`
      );
      beer.unique = beer.unique || [];

      promises.push(
        new Promise((resolve, reject) => {
          let delay = 1000 * (idx1 * idx1) + idx2 * 1000;
          setTimeout(
            () =>
              axios
                .get(url)
                .then(response => {
                  let unique = parseUntapped(response.data);
                  if (unique) beer.unique.push(user.name);
                  resolve(beer);
                })
                .then(res => resolve(res))
                .catch(err => {
                  console.log(err.response.status, err.response.headers);
                  reject(err);
                }),
            delay
          );
        })
      );
    });
  });
  return Promise.all(promises);
}

function parseUntapped(html) {
  const $ = cheerio.load(html);
  const node_count = $(
    ".distinct-list-list .distinct-list-list-container .beer-item"
  ).length;
  let unique = node_count === 0;
  return unique;
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

  beers = beers.map(beer => {
    beer = beer.replace(/\s+/g, " ");
    // process with namefilter if exists
    if (site.hasOwnProperty("namefilter")) {
      beer = site.namefilter(beer);
    }
    return {
      name: beer,
      location: site.name
    };
  });
  return new Promise(resolve => {
    resolve(beers);
  });
}

// main();

main();
