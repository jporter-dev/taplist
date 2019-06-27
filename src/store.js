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
    last_updated: null,
    last_updated_timestamp: null,
    untappd: null,
    untappd_user: null
  },
  mutations: {
    SET_DATA(state, data) {
      state.loading = false;
      state.taplist = data.taplist;
      state.users = data.users;
      state.last_updated = new Date(data.last_updated).toLocaleString();
      state.last_updated_timestamp = data.last_updated;
    },
    SET_DRAWER(state, payload) {
      state.drawer = payload;
    },
    SET_RIGHT_DRAWER(state, payload) {
      state.rightDrawer = payload;
    },
    SET_SEARCH(state, payload) {
      state.search = payload;
    },
    SET_UNTAPPD(state, payload) {
      state.untappd = payload;
    },
    SET_UNTAPPD_USER(state, payload) {
      state.untappd_user = payload;
    },
    LOGOUT(state) {
      state.untappd = null;
      state.untappd_user = null;
    }
  },
  actions: {
    getData(store) {
      fetch("/taplist.json")
        .then(response => response.json())
        .then(json => store.commit("SET_DATA", json));
    },
    getUntappdUser(store) {
      const base =
        process.env.NODE_ENV === "development"
          ? "https://api.untappd.com"
          : "/untappd_api";
      fetch(`${base}/v4/user/info?access_token=${store.state.untappd}`)
        .then(response => response.json())
        .then(json => store.commit("SET_UNTAPPD_USER", json.response.user));
    }
  }
});

store.dispatch("getData");

export default store;
