const yaml = require('js-yaml');
const request = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

function main() {
  // Get document, or throw exception on error
  try {
    let data = yaml.safeLoad(fs.readFileSync('./sites.yml', 'utf8'));
    data.sites.map(site => parseSite(site))
  } catch (e) {
    console.log(e);
  }
}

function parseSite(site) {
  request(site.url)
    .then((html) => {
      extractData(html.data, site)
      .then(list => {
        console.log(site.name, list.length)
      })
    })
}

function extractData(html, site) {
  return new Promise(function (resolve, reject) {
    const $ = cheerio.load(html)
    let beers = $(site.selector).map(function (i, el) {
      return $(this).text().trim();
    }).get();

    resolve(beers)
  })
}

main()
