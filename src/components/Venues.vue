<template>
  <v-list v-if="!loading">
    <v-subheader>Nearby Venues</v-subheader>
    <template v-for="(total, venue) in venues">
      <v-list-tile :key="venue + 'tile'" :to="`/venue/${venue}`">
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
    ...mapState(["taplist", "loading"]),
    venues() {
      let venues = this.taplist
        .map(item => item.location)
        .reduce((acc, name) => {
          acc[name] = acc[name] ? acc[name] + 1 : 1;
          return acc;
        }, {});
      const ordered_venues = {};
      Object.keys(venues)
        .sort()
        .forEach(function(key) {
          ordered_venues[key] = venues[key];
        });
      return ordered_venues;
    }
  },
  methods: {
    ...mapMutations(["SET_SEARCH", "SET_DRAWER"])
  }
};
</script>
