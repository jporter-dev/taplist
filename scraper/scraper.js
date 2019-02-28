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
  let promises = beers.map((beer, idx1) => {
    USERS.map((user, idx2) => {
      console.log(user);
      let url = encodeURI(
        `https://untappd.com/user/${user.name}/beers?sort=date&q=${beer.name}`
      );
      beer.unique = beer.unique || [];

      return new Promise((resolve, reject) => {
        let delay = 100 * (idx1 * idx1) * idx2;
        console.log(delay);
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
                console.log(err);
                reject(err);
              }),
          delay
        );
      });
    });
  });
  Promise.all(promises).then(() => {
    console.log(beers);
  });
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

getUntapped([
  {
    name: "Austin Eastciders Blood Orange Cider"
  },
  {
    name: "1623 Brewing Pilsner"
  },
  {
    name: "1623 IPA"
  },
  {
    name: "3 Stars Funkerdome #2"
  },
  {
    name: "3rd Wave Juice Box Cran/Or."
  },
  {
    name: "3rd Wave Juice Box Series: Peaches & Cream"
  },
  {
    name: "3rd Wave Kohana Choc/Cherry Stout"
  },
  {
    name: "Abita Amber"
  },
  {
    name: "Abita Rootbeer (Non Alcoholic)"
  },
  {
    name: "Abita Strawberry Harvest Lager"
  },
  {
    name: "Achouffe N'Ice Chouffe"
  },
  {
    name: "Adroit Theory Elegy(Fear) NE DIPA"
  },
  {
    name: "Adroit Theory IX (fedaykin Ed.) DIPA"
  },
  {
    name: "Adroit Theory IX(deathstill Ed.) DIPA"
  },
  {
    name: "Allagash Bon Vieux Temps"
  },
  {
    name: "Allagash Bon Vieux Temps"
  },
  {
    name: "Allagash Tripel"
  },
  {
    name: "Allagash White"
  },
  {
    name: "Allagash White Ale"
  },
  {
    name: "Alvinne Wild West w/French Plums"
  },
  {
    name: "Austin East Blood Orange Cider"
  },
  {
    name: "Austin Eastciders Blood Orange Cider"
  },
  {
    name: "Avery The Kaiser"
  },
  {
    name: "Backroom Lemon Basil Wheat"
  },
  {
    name: "Badische Staatsbrauerei Rothaus Rothaus Pils / Tannen Zäpfle"
  }
]);
