<template>
  <v-list v-if="!loading">
    <v-subheader v-if="!favs || (favs && Object.keys(favorites).length > 0)">{{
      title
    }}</v-subheader>
    <template v-for="(total, venue) in venues">
      <v-list-tile :key="venue + 'tile'" :to="`/venue/${venue}`" v-ripple>
        <v-list-tile-action @click.prevent="TOGGLE_FAVORITE(venue)">
          <v-icon v-if="favorites[venue]" color="yellow darken-3">star</v-icon>
          <v-icon v-else>star_border</v-icon>
        </v-list-tile-action>

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
  props: {
    title: { type: String, default: "Nearby Venues" },
    favs: { type: Boolean, default: false }
  },
  computed: {
    ...mapState(["taplist", "loading", "favorites"]),
    venues() {
      let venues = this.taplist
        .map(item => item.location)
        .filter(loc => (this.favs ? this.favorites[loc] : !this.favorites[loc]))
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
    ...mapMutations(["SET_SEARCH", "SET_DRAWER", "TOGGLE_FAVORITE"])
  }
};
</script>
