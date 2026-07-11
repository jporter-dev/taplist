// Name filters referenced by name from config.yml (`namefilter: <name>`).
// Each takes a raw scraped beer string and returns the cleaned name, or a
// falsy value to drop the entry.

export const wetCity = (word) => {
  word = word.replace(/Full Pour.*|\d+oz.*|\$.*/, "").trim();
  if (!word) return null;
  return word.indexOf(":") < 0 ? `Wet City ${word}` : word.replace(":", "");
};

export const union = (word) => `Union ${word}`;

export const stripLeadingNumbers = (word) => word.replace(/\d{1,2}\. /g, "");

export const sapwood = (word) => {
  word = word.replace(/^\*\s*/, "").split(" - ")[0].trim();
  if (!word) return null;
  return `Sapwood Cellars ${word}`;
};
