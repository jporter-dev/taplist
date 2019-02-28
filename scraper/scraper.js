#!/usr/bin/env node

const puppeteer = require("puppeteer");
const isWsl = require("is-wsl");
// const yaml = require("js-yaml");
// const path = require("path");
// const fs = require("fs");

// function main() {
//   // Get document, or throw exception on error
//   try {
//     let data = yaml.load(
//       fs.readFileSync(path.resolve(__dirname, "config.yml"), "utf8")
//     );
//     let db = [];
//     void(async () => {
//       let promises = data.sites.map(site => {
//         return new Promise(resolve => {
//           parseSite(site)
//             .then(beers => {
//               db = db.concat(beers);
//               resolve();
//             })
//             .catch(e => {
//               console.log(`${site.name}\n`, e);
//               process.exit(1);
//             });
//         });
//       });
//       Promise.all(promises).then(() =>
//         fs.writeFileSync(
//           path.resolve(__dirname, "../public/taplist.json"),
//           JSON.stringify({
//             taplist: db,
//             last_updated: Date.now()
//           })
//         )
//       );
//     })();
//   } catch (e) {
//     console.log(e);
//   }
// }

// async function parseSite(site) {
//   let opts = isWsl ?
//     {
//       executablePath: "/usr/bin/chromium-browser",
//       args: ["--no-sandbox", "--disable-setuid-sandbox"]
//     } :
//     {};
//   let browser = await puppeteer.launch(opts);
//   let page = await browser.newPage();
//   await page.goto(site.url);
//   await page.waitForSelector(site.selector);
//   let beers = await page.evaluate(selector => {
//     return Array.from(document.querySelectorAll(selector)).map(beer =>
//       beer.innerText.trim()
//     );
//   }, site.selector);
//   await browser.close();

//   beers = beers.map(beer => {
//     beer = beer.replace(/\s+/g, " ");
//     // process with namefilter if exists
//     if (site.hasOwnProperty("namefilter")) {
//       beer = site.namefilter(beer);
//     }
//     return {
//       name: beer,
//       location: site.name
//     };
//   });
//   return new Promise(resolve => {
//     resolve(beers);
//   });
// }

function getUniques(all) {
  all = all || false;
  let user = {
    username: "ididnotbiteyou"
  };
  if (!all) {
    fetchUntappd(user);
  }
}

async function fetchUntappd(user) {
  let opts = isWsl
    ? {
        executablePath: "/usr/bin/chromium-browser",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      }
    : {};
  let url = `https://untappd.com/user/${user.username}/beers`;

  console.log("Fetching untappd beers at " + url);
  let browser = await puppeteer.launch(opts);
  let page = await browser.newPage();
  let cookie = [];
  page.setCookie(...cookie);
  page.setExtraHTTPHeaders({
    authority: "untappd.com",
    pragma: "no-cache",
    "cache-control": "no-cache",
    "upgrade-insecure-requests": "1",
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "accept-language: en-US,en;q=0.9"
  });
  await page.tracing.start({ path: "./trace.json" });

  // go to users page
  await page.goto(url);
  let buttonSelector = "[data-href*=morebeers]";
  await page.waitForFunction(
    `document.querySelector('${buttonSelector}') && document.querySelector('${buttonSelector}').style.display != 'none'`
  );
  let x = await page.evaluate(() => document.querySelector(".more-list-items"));
  console.log(x);

  // load beer list
  let doneLoading = false;
  while (!doneLoading) {
    console.log("loading stuff");
    try {
      await page.click(buttonSelector);
      console.log("click!");
      await page.waitFor(5000);
      await page.tracing.stop();
      let bodyHTML = await page.evaluate(() => document.body.innerHTML);
      console.log(bodyHTML);

      // await page.waitForFunction(`document.querySelector('${buttonSelector}') && document.querySelector('${buttonSelector}').style.display != 'block'`)
      // console.log('display none')
      // await page.waitForFunction(`document.querySelector('${buttonSelector}') && document.querySelector('${buttonSelector}').style.display != 'none'`)
      // console.log('display block')
    } catch (error) {
      console.log(error);
      console.log("End of list.");
      doneLoading = true;
    }
  }

  let beers = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".beer-item")).map(
      item =>
        `${item
          .querySelector(".brewery")
          .innerText.trim()} ${item.querySelector(".name").innerText.trim()}`
    );
  });
  // await browser.close();

  console.log(beers);
}

getUniques();
