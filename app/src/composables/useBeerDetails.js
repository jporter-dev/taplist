import { useAuthStore } from "../stores/auth";

// Matches the worker's KV TTL so client ratings don't drift older than that.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Logged-in users query Untappd directly (their token includes auth_rating);
// logged-out users share the worker's KV-cached /api/beer endpoint.
export function useBeerDetails() {
  const auth = useAuthStore();

  const cacheKey = (name) => (auth.token ? `beer:${name}` : `beer:anon:${name}`);

  async function getBeer(name, { reload = false } = {}) {
    if (!reload) {
      try {
        const entry = JSON.parse(localStorage.getItem(cacheKey(name)));
        // Entries without a timestamp predate expiry and get refetched.
        if (entry?.t && Date.now() - entry.t < CACHE_TTL_MS) return entry.beer;
      } catch {
        // ignore unreadable cache entries
      }
    }

    const beer = auth.token ? await fetchWithToken(name) : await fetchAnon(name);
    try {
      localStorage.setItem(
        cacheKey(name),
        JSON.stringify({ t: Date.now(), beer })
      );
    } catch {
      // localStorage full or unavailable; caching is best-effort
    }
    return beer;
  }

  async function fetchWithToken(name) {
    const search = await untappdGet(
      `https://api.untappd.com/v4/search/beer?q=${encodeURIComponent(name)}&access_token=${auth.token}`
    );
    const items = search?.response?.beers?.items ?? [];
    // Scraped names are "<brewery> <beer>"; prefer a hit whose brewery
    // appears in the query over Untappd's sometimes-wrong first result.
    const query = name.toLowerCase();
    const match =
      items.find((item) => {
        const brewery = item.brewery?.brewery_name?.toLowerCase();
        return brewery && query.includes(brewery);
      }) ?? items[0];
    const bid = match?.beer?.bid;
    if (!bid) throw new Error("Unable to find beer on Untappd.");
    const info = await untappdGet(
      `https://api.untappd.com/v4/beer/info/${bid}?access_token=${auth.token}`
    );
    const beer = info?.response?.beer;
    if (!beer) throw new Error("Unable to load beer from Untappd.");
    return beer;
  }

  // Untappd reports errors in a JSON meta envelope, not the HTTP status.
  async function untappdGet(url) {
    let response;
    try {
      response = await fetch(url);
    } catch {
      throw new Error("Couldn't reach Untappd. Check your connection.");
    }
    const json = await response.json().catch(() => null);
    const code = json?.meta?.code ?? response.status;
    if (code === 429) {
      throw new Error(
        "Untappd hourly API limit reached. Ratings will load again after the top of the hour."
      );
    }
    if (!json || code !== 200) {
      throw new Error(json?.meta?.error_detail || `Untappd error (HTTP ${code}).`);
    }
    return json;
  }

  async function fetchAnon(name) {
    const response = await fetch(`/api/beer?q=${encodeURIComponent(name)}`);
    if (response.status === 404) throw new Error("Unable to find beer on Untappd.");
    if (!response.ok) throw new Error("Unable to load beer from Untappd.");
    return response.json();
  }

  return { getBeer };
}
