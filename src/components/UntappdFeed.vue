<template>
  <v-list three-line v-if="untappd_user">
    <v-subheader> {{ untappd_user.user_name }}'s Recent Check-ins</v-subheader>
    <template v-for="item in untappd_user.checkins.items">
      <v-list-tile
        :key="item.checkin_id"
        avatar
        target="_BLANK"
        rel="noopener noreferrer"
        :href="
          `https://untappd.com/user/${untappd_user.user_name}/checkin/${
            item.checkin_id
          }`
        "
      >
        <v-list-tile-avatar>
          <img :src="item.beer.beer_label" />
        </v-list-tile-avatar>
        <v-list-tile-content>
          <v-list-tile-title v-text="item.beer.beer_name"></v-list-tile-title>
          <v-list-tile-sub-title
            v-text="item.brewery.brewery_name"
          ></v-list-tile-sub-title>
          <v-list-tile-sub-title>
            <v-rating
              v-model="item.rating_score"
              color="yellow darken-3"
              dense
              small
              readonly
              half-increments
              :title="item.rating_score"
            ></v-rating>
            <span class="grey--text text--lighten-2 caption ml-2">
              ({{ item.rating_score }})
            </span>
          </v-list-tile-sub-title>
        </v-list-tile-content>
      </v-list-tile>
    </template>
  </v-list>
</template>

<script>
import { mapState } from "vuex";
export default {
  computed: {
    ...mapState(["untappd_user"])
  }
};
</script>

<style></style>
