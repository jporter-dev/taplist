import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: null,
    user: null,
  }),
  actions: {
    async loginWithCode(code) {
      const response = await fetch("/api/auth/untappd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) throw new Error("Untappd login failed");
      const { access_token } = await response.json();
      this.token = access_token;
      await this.fetchUser();
    },
    async fetchUser() {
      if (!this.token) return;
      const response = await fetch(
        `https://api.untappd.com/v4/user/info?access_token=${this.token}`
      );
      if (!response.ok) {
        if (response.status === 401) this.logout();
        return;
      }
      const json = await response.json();
      this.user = json.response.user;
    },
    logout() {
      this.token = null;
      this.user = null;
    },
  },
  persist: {
    pick: ["token"],
  },
});
