import { computed, ref, watch } from "vue";
import { useAuthStore } from "../stores/auth";

// Wishlist calls use the user's own token, so they draw from that user's
// per-token Untappd quota, not the app's shared anonymous one.
const CACHE_KEY = "wishlist:v2";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const PAGE_SIZE = 50;
const MAX_PAGES = 5;

// bid -> lowercased "<brewery> <beer>" (or null when only the bid is known).
// Names let taplist rows match wishlist entries even before any Untappd
// lookup has supplied a bid for the row.
const entries = ref(new Map());
const loading = ref(false);
let wired = false;

export function useWishlist() {
  const auth = useAuthStore();

  if (!wired) {
    wired = true;
    localStorage.removeItem("wishlist:v1");
    watch(
      () => auth.token,
      (token, old) => {
        if (!token) {
          entries.value = new Map();
          localStorage.removeItem(CACHE_KEY);
          return;
        }
        // A fresh login (old === null) may be a different user; skip the cache.
        refresh({ force: old === null });
      },
      { immediate: true }
    );
  }

  const bids = computed(() => entries.value);
  const names = computed(
    () => new Set([...entries.value.values()].filter(Boolean))
  );

  function entryName(item) {
    const brewery = item.brewery?.brewery_name ?? "";
    const beer = item.beer?.beer_name ?? "";
    const name = `${brewery} ${beer}`.trim().toLowerCase();
    return name || null;
  }

  async function refresh({ force = false } = {}) {
    if (!auth.token || loading.value) return;
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
        if (cached?.t && Date.now() - cached.t < CACHE_TTL_MS) {
          entries.value = new Map(cached.items);
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
        found.push(...items.map((item) => [item.beer.bid, entryName(item)]));
        if (items.length < PAGE_SIZE) {
          complete = true;
          break;
        }
      }
      if (found.length > 0 || complete) entries.value = new Map(found);
      // A partial fetch (rate limited mid-pagination) stays uncached so the
      // next session retries.
      if (complete) {
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ t: Date.now(), items: found })
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
  async function toggle(bid, name) {
    if (!auth.token || !bid) return undefined;
    const on = entries.value.has(bid);
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
    const next = new Map(entries.value);
    if (on) next.delete(bid);
    else next.set(bid, name?.trim().toLowerCase() || null);
    entries.value = next;
    // Sync an existing cache entry without extending its TTL; a partial
    // fetch has no entry and stays uncached.
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached?.t) {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ t: cached.t, items: [...next] })
        );
      }
    } catch {
      // caching is best-effort
    }
    return !on;
  }

  return { bids, names, loading, refresh, toggle };
}
