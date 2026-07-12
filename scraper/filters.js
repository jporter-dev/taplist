// Referenced from config.yml via `namefilter`. Return the cleaned name,
// or falsy to drop the entry.

export const wetCity = (word) => {
  word = word.replace(/Full Pour.*|\d+oz.*|\$.*/, "").trim();
  if (!word) return null;
  return word.indexOf(":") < 0 ? `Wet City ${word}` : word.replace(":", "");
};

export const union = (word) => `Union ${word}`;

export const crookedCrab = (word) => `Crooked Crab ${word}`;

export const stripLeadingNumbers = (word) => word.replace(/\d{1,2}\. /g, "");

export const sapwood = (word) => {
  word = word.replace(/^\*\s*/, "").split(" - ")[0].trim();
  if (!word) return null;
  return `Sapwood Cellars ${word}`;
};
