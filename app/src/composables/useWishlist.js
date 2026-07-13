import { ref, watch } from "vue";
import { useAuthStore } from "../stores/auth";

// Wishlist calls use the user's own token, so they draw from that user's
// per-token Untappd quota, not the app's shared anonymous one.
const CACHE_KEY = "wishlist:v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const PAGE_SIZE = 50;
const MAX_PAGES = 5;

const bids = ref(new Set());
const loading = ref(false);
let wired = false;

export function useWishlist() {
  const auth = useAuthStore();

  if (!wired) {
    wired = true;
    watch(
      () => auth.token,
      (token, old) => {
        if (!token) {
          bids.value = new Set();
          localStorage.removeItem(CACHE_KEY);
          return;
        }
        // A fresh login (old === null) may be a different user; skip the cache.
        refresh({ force: old === null });
      },
      { immediate: true }
    );
  }

  async function refresh({ force = false } = {}) {
    if (!auth.token || loading.value) return;
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
        if (cached?.t && Date.now() - cached.t < CACHE_TTL_MS) {
          bids.value = new Set(cached.bids);
          return;
        }
      } catch {
        // fall through to a fresh fetch
      }
    }

    loading.value = true;
    try {
      const found = [];
      let complete = false;
      for (let page = 0; page < MAX_PAGES; page++) {
        const response = await fetch(
          `https://api.untappd.com/v4/user/wishlist?access_token=${auth.token}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
        );
        const json = await response.json().catch(() => null);
        if (json?.meta?.code !== 200) break;
        const items = json.response?.beers?.items ?? [];
        found.push(...items.map((item) => item.beer.bid));
        if (items.length < PAGE_SIZE) {
          complete = true;
          break;
        }
      }
      if (found.length > 0 || complete) bids.value = new Set(found);
      // A partial fetch (rate limited mid-pagination) stays uncached so the
      // next session retries.
      if (complete) {
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ t: Date.now(), bids: found })
          );
        } catch {
          // caching is best-effort
        }
      }
    } finally {
      loading.value = false;
    }
  }

  // Returns the new state (true = on the wishlist).
  async function toggle(bid) {
    if (!auth.token || !bid) return undefined;
    const on = bids.value.has(bid);
    const action = on ? "delete" : "add";
    let json;
    try {
      const response = await fetch(
        `https://api.untappd.com/v4/user/wishlist/${action}?access_token=${auth.token}&bid=${bid}`
      );
      json = await response.json().catch(() => null);
    } catch {
      throw new Error("Couldn't reach Untappd. Check your connection.");
    }
    if (json?.meta?.code !== 200) {
      throw new Error(
        json?.meta?.error_detail || "Untappd wishlist update failed."
      );
    }
    const next = new Set(bids.value);
    if (on) next.delete(bid);
    else next.add(bid);
    bids.value = next;
    // Sync an existing cache entry without extending its TTL; a partial
    // fetch has no entry and stays uncached.
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached?.t) {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ t: cached.t, bids: [...next] })
        );
      }
    } catch {
      // caching is best-effort
    }
    return !on;
  }

  return { bids, loading, refresh, toggle };
}
