import { useAuthStore } from "../stores/auth";

// Untappd beer lookups, cached in localStorage. Logged-in users query
// Untappd directly with their own token (includes auth_rating); logged-out
// users go through the worker's shared, KV-cached /api/beer endpoint.
export function useBeerDetails() {
  const auth = useAuthStore();

  const cacheKey = (name) => (auth.token ? `beer:${name}` : `beer:anon:${name}`);

  async function getBeer(name, { reload = false } = {}) {
    if (!reload) {
      try {
        const cached = localStorage.getItem(cacheKey(name));
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore unreadable cache entries
      }
    }

    const beer = auth.token ? await fetchWithToken(name) : await fetchAnon(name);
    try {
      localStorage.setItem(cacheKey(name), JSON.stringify(beer));
    } catch {
      // localStorage full or unavailable; caching is best-effort
    }
    return beer;
  }

  async function fetchWithToken(name) {
    const search = await untappdGet(
      `https://api.untappd.com/v4/search/beer?q=${encodeURIComponent(name)}&access_token=${auth.token}`
    );
    const bid = search?.response?.beers?.items?.[0]?.beer?.bid;
    if (!bid) throw new Error("Unable to find beer on Untappd.");
    const info = await untappdGet(
      `https://api.untappd.com/v4/beer/info/${bid}?access_token=${auth.token}`
    );
    const beer = info?.response?.beer;
    if (!beer) throw new Error("Unable to load beer from Untappd.");
    return beer;
  }

  // Untappd allows 100 requests/hour per user and reports errors in the
  // JSON meta envelope, so decode that instead of trusting fetch alone.
  async function untappdGet(url) {
    let response;
    try {
      response = await fetch(url);
    } catch {
      throw new Error("Couldn't reach Untappd — check your connection.");
    }
    const json = await response.json().catch(() => null);
    const code = json?.meta?.code ?? response.status;
    if (code === 429) {
      const error = new Error(
        "Untappd hourly API limit reached — ratings will load again after the top of the hour."
      );
      error.rateLimited = true;
      throw error;
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
