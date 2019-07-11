<template>
  <v-layout>
    <v-btn
      v-if="!untappd"
      color="yellow darken-3"
      block
      :href="
        `https://untappd.com/oauth/authenticate/?client_id=${untappd_client_id}&response_type=code&redirect_url=${redirect_url}`
      "
    >
      {{ label }}
    </v-btn>
    <v-btn v-else block @click="LOGOUT">
      Log Out
    </v-btn>
  </v-layout>
</template>

<script>
import { mapState, mapMutations, mapActions } from "vuex";

export default {
  props: { label: { type: String, default: "Log In with Untappd" } },
  data() {
    return {
      redirect_url: `//${window.location.host}`,
      untappd_client_id: process.env.VUE_APP_UNTAPPD_ID,
      untappd_client_secret: process.env.VUE_APP_UNTAPPD_SECRET
    };
  },
  computed: {
    ...mapState(["untappd", "untappd_user"])
  },
  methods: {
    ...mapMutations(["SET_UNTAPPD", "LOGOUT"]),
    ...mapActions(["getUntappdUser"])
  },
  watch: {
    untappd: {
      immediate: true,
      handler() {
        if (this.untappd && !this.untappd_user) {
          this.getUntappdUser();
        }
      }
    }
  },
  mounted() {
    if (!this.untappd && this.$route.query.code) {
      fetch(
        `${this.redirect_url}/untappd/oauth/authorize/?client_id=${
          this.untappd_client_id
        }&client_secret=${
          this.untappd_client_secret
        }&response_type=code&redirect_url=${this.redirect_url}&code=${
          this.$route.query.code
        }`
      )
        .then(response => response.json())
        .then(json => {
          this.SET_UNTAPPD(json.response.access_token);
          this.$router.push({ ...this.$route, query: {} });
        });
    }
  }
};
</script>

<style></style>
