#!/usr/bin/env node

const algoliasearch = require("algoliasearch");
const puppeteer = require("puppeteer");
const isWsl = require("is-wsl");
const yaml = require("js-yaml");
const path = require("path");
const fs = require("fs");

const algoClient = algoliasearch(process.env.ALGO_APPID, process.env.ALGO_APIKEY);
const beerIndex = algoClient.initIndex('unique_beers');
const userIndex = algoClient.initIndex('unique_beer_users');


function main() {
  // Get document, or throw exception on error
  try {
    let data = yaml.load(
      fs.readFileSync(path.resolve(__dirname, "config.yml"), "utf8")
    );
    let db = [];
    void(async () => {
      let promises = data.sites.map(site => {
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
  let opts = isWsl ? {
    executablePath: "/usr/bin/chromium-browser",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  } : {};
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

function getUniques(all) {
  all = all || false;
  let user = {
    username: "maryjbalt"
  };
  if (!all) {
    fetchUntappd(user)
      .then(beers => {
        exportBeers(beers)
      })
  }
}

function exportBeers(beers) {
  beerIndex.addObjects(beers, function (err, content) {
    console.log(content);
  });
}

async function fetchUntappd(user) {
  let opts = isWsl ? {
    executablePath: "/usr/bin/chromium-browser",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  } : {};
  opts['env'] = {
    TZ: 'America/New_York',
    ...process.env
  }

  // launch puppeteer
  let browser = await puppeteer.launch(opts);
  let page = await browser.newPage();
  // get cookies
  let cookieFile = JSON.parse(fs.readFileSync(path.resolve(__dirname, "cookies.json"), "utf8"))
  let cookies = process.env.UNTAPPD_COOKIES || cookieFile
  await page.setCookie(...cookies)
  await page.setExtraHTTPHeaders({
    "authority": 'untappd.com',
    "pragma": "no-cache",
    "cache-control": "no-cache",
    "upgrade-insecure-requests": "1",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "accept-language: en-US,en;q=0.9"
  })

  // go to users page
  let userBeers = []
  userBeers = userBeers.concat(await loadUser(user, page))
  // close browser
  await browser.close();

  return new Promise(resolve => resolve(userBeers))
}

async function loadUser(user, page) {
  let url = `https://untappd.com/user/${user.username}/beers`;
  console.log("Fetching untappd beers at " + url);

  // go to users page
  await page.goto(url);
  let buttonSelector = '[data-href*=morebeers]';
  await page.waitForFunction(`document.querySelector('${buttonSelector}') && document.querySelector('${buttonSelector}').style.display != 'none'`);

  // load beer list
  let doneLoading = false;
  while (!doneLoading) {
    console.log(`Loading more distinct beers for ${user.username}...`)
    try {
      await page.click(buttonSelector);
      await page.waitFor(2000)
      await page.waitForFunction(`document.querySelector('${buttonSelector}') && document.querySelector('${buttonSelector}').style.display != 'none'`, {
        timeout: 5000
      })
    } catch (error) {
      console.log("End of list reached.");
      doneLoading = true;
    }
  }

  // load content from page
  let beers = await page.evaluate((username) => {
    return Array.from(document.querySelectorAll(".beer-item")).map(
      item => {
        let brewery = item.querySelector(".brewery").innerText.trim()
        let name = item.querySelector(".name").innerText.trim()
        return {
          objectID: `${username}-${item.dataset.bid}`,
          name: `${brewery} ${name}`,
          brewery: brewery,
          beer: name,
          firstCheckin: item.querySelector('.date a[data-href*=firstCheckin]').innerText,
          recentCheckin: item.querySelector('.date a[data-href*=firstCheckin]').innerText,
          username: username
        }
      }
    );
  }, user.username);
  return new Promise(resolve => resolve(beers))
}

userIndex.search({
  query: 'maryjbalt',
  attributesToRetrieve: ['recentCheckin'],
  hitsPerPage: 1
}, (err, content) => {
  if (err) throw err;
  console.log(new Date(content.hits[0].recentCheckin).toString())
})
// getUniques();


console.log(new Date())
