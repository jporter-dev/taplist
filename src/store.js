import Vue from "vue";
import Vuex from "vuex";
import createPersistedState from "vuex-persistedstate";
import Cookies from "js-cookie";

Vue.use(Vuex);

const store = new Vuex.Store({
  plugins: [
    createPersistedState({
      storage: {
        getItem: key => Cookies.get(key),
        setItem: (key, value) =>
          Cookies.set(key, value, { expires: 3, secure: true }),
        removeItem: key => Cookies.remove(key)
      }
    })
  ],
  state: {
    loading: true,
    drawer: null,
    rightDrawer: null,
    search: null,
    taplist: null,
    users: null,
    leaderboard: null,
    last_updated: null
  },
  mutations: {
    SET_DATA(state, data) {
      state.loading = false;
      state.taplist = data.taplist;
      state.users = data.users;
      state.last_updated = new Date(data.last_updated).toLocaleString();
    },
    SET_DRAWER(state, payload) {
      state.drawer = payload;
    },
    SET_RIGHT_DRAWER(state, payload) {
      state.rightDrawer = payload;
    },
    SET_SEARCH(state, payload) {
      state.search = payload;
    }
  },
  actions: {
    getData(store) {
      fetch("/taplist.json")
        .then(response => response.json())
        .then(json => store.commit("SET_DATA", json));
    }
  }
});

store.dispatch("getData");

export default store;
