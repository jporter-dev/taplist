#!/usr/bin/env node

const yaml = require('js-yaml');
const axios = require('axios');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');


function main() {
  // Get document, or throw exception on error
  try {
    let data = yaml.safeLoad(fs.readFileSync(path.resolve(__dirname, 'sites.yml'), 'utf8'));
    let db = []
    void(async () => {
      let promises = data.sites.map(site => {
        return new Promise(resolve => {
          parseSite(site)
            .then(beers => {
              db = db.concat(beers)
              resolve()
            })
        })
      })
      Promise.all(promises)
        .then(() => fs.writeFileSync(path.resolve(__dirname, '../public/taplist.json'), JSON.stringify(db)))
    })()
  } catch (e) {
    console.log(e);
  }
}

async function parseSite(site) {
  let browser = await puppeteer.launch()
  let page = await browser.newPage()
  await page.goto(site.url)
  await page.waitForSelector(site.selector);
  let beers = await page.evaluate((selector) => {
    const list = Array.from(document.querySelectorAll(selector));
    return list.map(item => item.innerText.trim().replace(/\s+/g, " "));
  }, site.selector);
  await browser.close()

  beers = beers.map(beer => {
    return {
      name: beer,
      location: site.name
    }
  })
  return new Promise(resolve => {
    resolve(beers)
  })
}


function ingest(site, beers) {
  beers.map(beer => {
    const mutation = `mutation {
  upsertLocation(
    where: { name: "${site.name}" }
    create: { name: "${site.name}", url: "${site.url}" }
    update: { name: "${site.name}" }
  ) {
    id
  }
  upsertBeer(
    where: { name: "${beer}" }
    create: {
      name: "${beer}"
      locations: { connect: [{ name: "${site.name}" }] }
    }
    update: {
      locations: { connect: [{ name: "${site.name}" }] }
    }
  ) {
    id
  }
}`
    axios({
        url: 'http://localhost:4466',
        method: 'POST',
        data: {
          query: mutation
        }
      })
      .then(function (response) {
        console.log(response.data);
      })
      .catch(function (error) {
        console.log("ERROR!!!!!!!!!!!", error);
      });
  })
}

main()
