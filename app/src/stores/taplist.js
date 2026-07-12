import { defineStore } from "pinia";

const STALE_HOURS = 36;

export const useTaplistStore = defineStore("taplist", {
  state: () => ({
    data: null,
    loading: true,
    search: "",
    favorites: {},
  }),
  getters: {
    beers(state) {
      if (!state.data?.venues) return [];
      return Object.values(state.data.venues).flatMap((v) => v.beers);
    },
    lastUpdatedTs(state) {
      if (!state.data?.venues) return null;
      return Object.values(state.data.venues).reduce(
        (max, v) => Math.max(max, v.last_updated),
        0
      );
    },
    lastUpdated() {
      return this.lastUpdatedTs
        ? new Date(this.lastUpdatedTs).toLocaleString()
        : null;
    },
    isStale() {
      if (!this.lastUpdatedTs) return false;
      return Date.now() - this.lastUpdatedTs > STALE_HOURS * 60 * 60 * 1000;
    },
  },
  actions: {
    async fetchTaplist() {
      try {
        const response = await fetch("/api/taplist", { cache: "no-store" });
        this.data = await response.json();
      } finally {
        this.loading = false;
      }
    },
    toggleFavorite(venue) {
      this.favorites[venue] = !this.favorites[venue];
    },
  },
  persist: {
    pick: ["favorites"],
  },
});
