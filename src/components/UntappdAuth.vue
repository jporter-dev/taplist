<template>
  <v-btn
    color="yellow darken-3"
    :href="
      `${redirect_url}/oauth/authenticate/?client_id=${untappd_client_id}&response_type=code&redirect_url=${redirect_url}`
    "
  >
    Login with Untappd
  </v-btn>
</template>

<script>
export default {
  data() {
    return {
      redirect_url: `http://${window.location.host}`,
      authorized: false,
      untappd_client_id: process.env.VUE_APP_UNTAPPD_ID,
      untappd_client_secret: process.env.VUE_APP_UNTAPPD_SECRET
    };
  },
  mounted() {
    if (!this.authorized && this.$route.query.code) {
      fetch(
        `${this.redirect_url}/oauth/authorize/?client_id=${
          this.untappd_client_id
        }&client_secret=${
          this.untappd_client_secret
        }&response_type=code&redirect_url=${this.redirect_url}&code=${
          this.$route.query.code
        }`
      )
        .then(resp => {
          console.log(resp);
          return resp.json();
        })
        .then(json => console.log(json));
    }
  }
};
</script>

<style></style>
