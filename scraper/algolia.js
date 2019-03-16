const algoliasearch = require("algoliasearch");
const dotenv = require("dotenv");
dotenv.config();

const algoClient = algoliasearch(
  process.env.ALGO_APPID,
  process.env.ALGO_APIKEY
);
const algoClient2 = algoliasearch(
  process.env.ALGO_APPID2,
  process.env.ALGO_APIKEY2
);

module.exports = {
  0: {
    user: algoClient.initIndex("unique_beers_users"),
    beer: algoClient.initIndex("unique_beers")
  },
  1: {
    user: algoClient2.initIndex("unique_beers_users"),
    beer: algoClient2.initIndex("unique_beers")
  }
};
