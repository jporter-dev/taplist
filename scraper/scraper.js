#!/usr/bin/env node

const yaml = require('js-yaml');
const axios = require('axios');
const puppeteer = require('puppeteer');
const fs = require('fs');

function main() {
  // Get document, or throw exception on error
  try {
    let data = yaml.safeLoad(fs.readFileSync('./sites.yml', 'utf8'));
    void(async () => {
      await data.sites.map(site => parseSite(site))
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
  const beers = await page.evaluate((selector) => {
    const list = Array.from(document.querySelectorAll(selector));
    return list.map(item => item.innerText.trim().replace(/\s+/g, " "));
  }, site.selector);
  await browser.close()
  ingest(site, beers)
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
