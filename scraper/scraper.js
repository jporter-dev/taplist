const yaml = require('js-yaml');
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
    return list.map(item => item.innerText.trim());
  }, site.selector);
  await browser.close()
  console.log(site.name, beers.length)
}

main()
