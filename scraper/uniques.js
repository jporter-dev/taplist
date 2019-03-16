#!/usr/bin/env node

const puppeteer = require("puppeteer");
const isWsl = require("is-wsl");
const yaml = require("js-yaml");
const path = require("path");
const fs = require("fs");
const indices = require("./algolia");

const CONFIG = yaml.load(
  fs.readFileSync(path.resolve(__dirname, "config.yml"), "utf8")
);

function getUniques(all) {
  all = all || false;
  if (!all) {
    CONFIG.users.forEach(async user => {
      fetchUntappd(user).then(beers => {
        exportBeers(beers, user);
      });
    });
  }
}

function exportBeers(beers, user) {
  let index = user.index || 0;
  indices[index].beer.addObjects(beers, function(err) {
    if (err) throw err;
  });
}

function fetchUntappd(user) {
  let opts = isWsl
    ? {
        executablePath: "/usr/bin/chromium-browser",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      }
    : {};
  opts["env"] = {
    TZ: "America/New_York",
    ...process.env
  };
  return new Promise(async resolve => {
    // launch puppeteer
    let browser = await puppeteer.launch(opts);
    let page = await browser.newPage();
    let cookies = JSON.parse(process.env.UNTAPPD_COOKIES);

    await page.setCookie(...cookies);
    await page.setExtraHTTPHeaders({
      authority: "untappd.com",
      pragma: "no-cache",
      "cache-control": "no-cache",
      "upgrade-insecure-requests": "1",
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "accept-encoding": "gzip, deflate, br",
      "accept-language": "accept-language: en-US,en;q=0.9"
    });

    // go to users page
    let userBeers = [];
    userBeers = userBeers.concat(await loadUser(user, page));
    // close browser
    await browser.close();

    resolve(userBeers);
  });
}

async function loadUser(user, page) {
  let url = `https://untappd.com/user/${user.username}/beers`;
  console.log("Fetching untappd beers at " + url);

  let lastBeerDate = await lastBeer(user);
  console.log(
    `Last known checkin for ${user.username}: ${lastBeerDate.toString()}`
  );

  // go to users page
  await page.goto(url);
  let buttonSelector = "[data-href*=morebeers]";
  await page.waitForFunction(
    `document.querySelector('${buttonSelector}') && document.querySelector('${buttonSelector}').style.display != 'none'`
  );

  // load beer list
  let doneLoading = false;
  while (!doneLoading) {
    try {
      // check page to see if it contains any beers older than last beer in Algolia
      doneLoading = await page.evaluate(lastBeerDate => {
        let dates = Array.from(
          document.querySelectorAll(
            ".beer-item .date a[data-href*=recentCheckin]"
          )
        ).map(item => {
          let date = new Date(item.innerText.trim());
          return date < new Date(lastBeerDate);
        });
        return dates;
      }, lastBeerDate);
      doneLoading = doneLoading.filter(x => x).length > 0;

      console.log(`Loading more distinct beers for ${user.username}...`);
      // click "Load More"
      await page.click(buttonSelector);
      await page.waitFor(2000);
      await page.waitForFunction(
        `document.querySelector('${buttonSelector}') && document.querySelector('${buttonSelector}').style.display != 'none'`,
        {
          timeout: 30000
        }
      );
    } catch (error) {
      console.log(error);
      console.log("End of list reached.");
      doneLoading = true;
    }
  }

  // load content from page
  let beers = await page.evaluate(username => {
    return Array.from(document.querySelectorAll(".beer-item")).map(item => {
      let brewery = item.querySelector(".brewery").innerText.trim();
      let name = item.querySelector(".name").innerText.trim();
      return {
        objectID: `${username}-${item.dataset.bid}`,
        name: `${brewery} ${name}`,
        brewery: brewery,
        beer: name,
        firstCheckin: parseInt(
          new Date(
            item.querySelector(".date a[data-href*=firstCheckin]").innerText
          ).getTime() / 1000
        ),
        recentCheckin: parseInt(
          new Date(
            item.querySelector(".date a[data-href*=recentCheckin]").innerText
          ).getTime() / 1000
        ),
        username: username
      };
    });
  }, user.username);

  beers = await beers.filter(beer => {
    return new Date(beer.recentCheckin * 1000) >= new Date(lastBeerDate);
  });
  return new Promise(resolve => resolve(beers));
}

function lastBeer(user) {
  let index = user.index || 0;
  console.log(index);
  return new Promise(resolve => {
    indices[index].beer.search(
      {
        query: user.username,
        attributesToRetrieve: ["recentCheckin"],
        hitsPerPage: 1
      },
      (err, content) => {
        if (err) throw err;
        console.log(content.hits);
        if (content.hits[0])
          resolve(new Date(content.hits[0].recentCheckin * 1000));
        else {
          resolve(new Date(0));
        }
      }
    );
  });
}

module.exports = getUniques;
