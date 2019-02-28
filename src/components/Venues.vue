<template>
  <v-list>
    <v-subheader>Nearby Venues</v-subheader>
    <v-divider></v-divider>
    <template v-for="(total, venue) in venues">
      <v-list-tile :key="venue + 'tile'" @click="click(venue)">
        <v-list-tile-content>
          {{ venue }}
        </v-list-tile-content>
        <v-list-tile-action>
          <v-chip>{{ total }}</v-chip>
        </v-list-tile-action>
      </v-list-tile>
      <v-divider :key="venue + 'divider'"></v-divider>
    </template>
  </v-list>
</template>

<script>
import { mapState, mapMutations } from "vuex";

export default {
  name: "Venues",
  computed: {
    ...mapState(["taplist"]),
    venues() {
      return this.taplist
        .map(item => item.location)
        .reduce((acc, name) => {
          acc[name] = acc[name] ? acc[name] + 1 : 1;
          return acc;
        }, {});
    }
  },
  methods: {
    ...mapMutations(["SET_SEARCH", "SET_DRAWER"]),
    click(venue) {
      this.SET_SEARCH(venue);
      this.SET_DRAWER(false);
    }
  }
};
</script>
