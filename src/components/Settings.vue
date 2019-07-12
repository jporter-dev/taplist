<template>
  <v-layout row wrap>
    <v-flex xs12>
      <UntappdAuth class="ma-2" v-if="$store.state.untappd"></UntappdAuth>
      <UntappdFeed></UntappdFeed>
      <v-divider></v-divider>
      <v-btn block flat @click="showTools = !showTools"
        >Toggle Developer Tools</v-btn
      >
      <v-slide-y-transition>
        <v-layout v-show="showTools" row wrap>
          <v-flex xs12>
            <v-btn @click="clearStorage" block color="red darken-1">
              Clear Local Storage
            </v-btn>
          </v-flex>
          <v-flex xs12>
            <v-btn @click="showUntappdInfo" block color="red darken-1">
              Show Untappd Info
            </v-btn>
          </v-flex>
        </v-layout>
      </v-slide-y-transition>
    </v-flex>
  </v-layout>
</template>

<script>
import UntappdAuth from "@/components/UntappdAuth";
import UntappdFeed from "@/components/UntappdFeed";
export default {
  components: { UntappdFeed, UntappdAuth },
  data() {
    return {
      showTools: false
    };
  },
  methods: {
    clearStorage() {
      window.localStorage.clear();
    },
    showUntappdInfo() {
      alert(this.$store.state.untappd);
      alert(JSON.stringify(this.$store.state.untappd_user));
    }
  }
};
</script>

<style></style>
