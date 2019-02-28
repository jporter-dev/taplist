import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    drawer: null,
    search: null,
    taplist: require("../public/taplist.json")
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
