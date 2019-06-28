<template>
  <v-layout row wrap>
    <v-flex xs12>
      <UntappdAuth></UntappdAuth>
      <UntappdFeed></UntappdFeed>
    </v-flex>
  </v-layout>
</template>

<script>
import UntappdAuth from "@/components/UntappdAuth";
import UntappdFeed from "@/components/UntappdFeed";
export default {
  components: { UntappdFeed, UntappdAuth }
};
</script>

<style></style>
