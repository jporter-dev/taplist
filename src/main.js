import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import Vuetify from "vuetify";
import bugsnag from "@bugsnag/js";
import bugsnagVue from "@bugsnag/plugin-vue";

//import "./registerServiceWorker";
import "vuetify/dist/vuetify.min.css"; // Ensure you are using css-loader

const bugsnagClient = bugsnag(process.env.VUE_APP_BUGSNAG);
bugsnagClient.use(bugsnagVue, Vue);

Vue.use(Vuetify);

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");
