import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

const data = require("../public/taplist.json");

export default new Vuex.Store({
  state: {
    drawer: null,
    search: null,
    taplist: data.taplist,
    users: data.users,
    leaderboard: data.uniqueCounts,
    last_updated: new Date(data.last_updated).toLocaleString()
  },
  mutations: {
    SET_DRAWER(state, payload) {
      state.drawer = payload;
    },
    SET_SEARCH(state, payload) {
      state.search = payload;
    }
  },
  actions: {}
});
