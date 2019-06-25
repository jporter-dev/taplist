<template>
  <v-layout row wrap>
    <v-flex xs12>
      <v-subheader>Settings</v-subheader>
    </v-flex>
    <v-flex xs12>
      <UntappdAuth></UntappdAuth>
      <v-text-field
        label="Untappd Username"
        solo
        light
        flat
        single-line
      ></v-text-field>
    </v-flex>
  </v-layout>
</template>

<script>
import UntappdAuth from "@/components/UntappdAuth";
export default {
  components: { UntappdAuth }
};
</script>

<style></style>
