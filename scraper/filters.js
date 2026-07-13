// Referenced from config.yml via `namefilter`. Return the cleaned name,
// or falsy to drop the entry.

export const wetCity = (word) => {
  word = word.replace(/Full Pour.*|\d+oz.*|\$.*/, "").trim();
  if (!word) return null;
  return word.indexOf(":") < 0 ? `Wet City ${word}` : word.replace(":", "");
};

export const union = (word) => `Union ${word}`;

export const crookedCrab = (word) => `Crooked Crab ${word}`;

export const ministry = (word) => `Ministry of Brewing ${word}`;

// Selection includes h4 section headers and description rows so the cans
// marker survives for stopAt; everything but bare beer names is dropped here.
export const nepenthe = (word) => {
  word = word.replace(/[\u200b\u200c\u200d\ufeff]/g, "").trim();
  if (!word) return null;
  if (/^(on tap|malt|hops|notes|additions|the brew|contains|yeast)\b/i.test(word)) return null;
  if (word.includes("&") || /beers$/i.test(word)) return null;
  return `Nepenthe ${word}`;
};

export const stripLeadingNumbers = (word) => word.replace(/\d{1,2}\. /g, "");

export const sapwood = (word) => {
  word = word.replace(/^\*\s*/, "").split(" - ")[0].trim();
  if (!word) return null;
  return `Sapwood Cellars ${word}`;
};
