import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    search: null,
    taplist: require("../public/taplist.json")
  },
  mutations: {
    SET_SEARCH(state, payload) {
      state.search = payload;
    }
  },
  actions: {}
});
