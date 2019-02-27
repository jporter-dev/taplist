#!/usr/bin/env node

const yaml = require("js-yaml");
const puppeteer = require("puppeteer");
const isWsl = require("is-wsl");
const process = require("process");
const path = require("path");
const fs = require("fs");

function main() {
  // Get document, or throw exception on error
  try {
    let data = yaml.load(
      fs.readFileSync(path.resolve(__dirname, "config.yml"), "utf8")
    );
    let db = [];
    void (async () => {
      let promises = data.sites.map(site => {
        return new Promise(resolve => {
          parseSite(site)
            .then(beers => {
              db = db.concat(beers);
              resolve();
            })
            .catch(e => {
              console.log(site.name, e);
              process.exit();
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

main();
