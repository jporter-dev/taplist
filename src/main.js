import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import Vuetify from "vuetify";
import bugsnag from "@bugsnag/js";
import bugsnagVue from "@bugsnag/plugin-vue";

//import "./registerServiceWorker";
import "vuetify/dist/vuetify.min.css";
import colors from "vuetify/es5/util/colors";

if (process.env.NODE_ENV !== "development") {
  const bugsnagClient = bugsnag(process.env.VUE_APP_BUGSNAG);
  bugsnagClient.use(bugsnagVue, Vue);
}

Vue.use(Vuetify, {
  theme: {
    primary: colors.amber.darken1
  }
});

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");
