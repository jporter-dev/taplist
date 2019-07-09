<template>
  <v-layout row wrap>
    <v-flex xs12>
      <UntappdAuth></UntappdAuth>
      <UntappdFeed></UntappdFeed>
      <v-divider></v-divider>
      <v-btn block flat @click="showTools = !showTools"
        >Toggle Developer Tools</v-btn
      >
      <v-slide-y-transition>
        <v-layout v-show="showTools">
          <v-btn @click="clearStorage" color="red darken-1">
            Clear Local Storage
          </v-btn>
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
    }
  }
};
</script>

<style></style>
