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
    const search = await fetch(
      `https://api.untappd.com/v4/search/beer?q=${encodeURIComponent(name)}&access_token=${auth.token}`
    ).then((r) => r.json());
    const bid = search?.response?.beers?.items?.[0]?.beer?.bid;
    if (!bid) throw new Error("Unable to find beer on Untappd.");
    const info = await fetch(
      `https://api.untappd.com/v4/beer/info/${bid}?access_token=${auth.token}`
    ).then((r) => r.json());
    const beer = info?.response?.beer;
    if (!beer) throw new Error("Unable to load beer from Untappd.");
    return beer;
  }

  async function fetchAnon(name) {
    const response = await fetch(`/api/beer?q=${encodeURIComponent(name)}`);
    if (response.status === 404) throw new Error("Unable to find beer on Untappd.");
    if (!response.ok) throw new Error("Unable to load beer from Untappd.");
    return response.json();
  }

  return { getBeer };
}
