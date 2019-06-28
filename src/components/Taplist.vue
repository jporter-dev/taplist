<template>
  <v-card>
    <v-card-title>
      <h3 class="hidden-sm-and-down">
        Local Taplist
      </h3>
      <v-spacer class="hidden-sm-and-down"></v-spacer>
      <v-text-field
        v-model="search"
        append-icon="search"
        label="Search"
        single-line
        hide-details
      ></v-text-field>
    </v-card-title>
    <v-data-table
      v-if="!loading"
      :headers="headers"
      :items="taplist"
      :search="search"
      :rows="10"
      :rows-per-page-items="[25, 50, 100]"
      item-key="id"
      expand
    >
      <template v-slot:items="props">
        <tr
          @click="clicked(props)"
          class="beer-row"
          :class="{ expanded: props.expanded }"
        >
          <td>
            <v-icon v-if="!props.expanded">expand_more</v-icon>
            <v-icon v-else>expand_less</v-icon>
          </td>
          <td>{{ props.item.name }}</td>
          <td>
            <v-progress-circular
              v-if="props.item.loading"
              indeterminate
              color="amber"
            ></v-progress-circular>
            <user-avatar
              v-else
              transition="fade-transition"
              v-for="username in props.item.checkins"
              :key="username"
              :user="users[username]"
            >
            </user-avatar>
          </td>
        </tr>
      </template>
      <template v-slot:expand="props">
        <v-card flat color="grey darken-1">
          <v-card-text>
            <v-layout row justify-center>
              <v-flex xs12 md6 my-2>
                <h3 class="mb-2">Description</h3>
                {{ props.item.beer.beer_description }}
              </v-flex>
            </v-layout>
            <v-layout row wrap justify-center>
              <v-flex xs6 md3>
                <v-layout wrap>
                  <v-flex shrink mr-5>
                    <h3>
                      Your Rating
                      <span class="caption"
                        >({{
                          props.item.beer.stats.user_count === 0
                            ? "N/A"
                            : props.item.beer.auth_rating
                        }})</span
                      >
                    </h3>
                  </v-flex>
                  <v-flex grow>
                    <v-rating
                      v-model="props.item.beer.auth_rating"
                      color="yellow darken-3"
                      small
                      readonly
                      half-increments
                    ></v-rating>
                    <span class="red--text text--lighten-3">
                      {{ props.item.error }}
                    </span>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex xs6 md3>
                <v-layout wrap>
                  <v-flex shrink mr-5>
                    <h3>
                      Global Rating
                      <span class="caption"
                        >({{ props.item.beer.rating_score }})</span
                      >
                    </h3>
                  </v-flex>
                  <v-flex grow>
                    <v-rating
                      v-model="props.item.beer.rating_score"
                      color="yellow darken-3"
                      small
                      readonly
                      half-increments
                    ></v-rating>
                    <span class="red--text text--lighten-3">
                      {{ props.item.error }}
                    </span>
                  </v-flex>
                </v-layout>
              </v-flex>
            </v-layout>
            <v-layout row wrap justify-center>
              <v-flex xs6 md3>
                <v-flex xs12>
                  <h3>Style</h3>
                  <p>{{ props.item.beer.beer_style }}</p>
                </v-flex>
                <v-flex xs12>
                  <h3>Location</h3>
                  <p>{{ props.item.location }}</p>
                </v-flex>
              </v-flex>
              <v-flex xs6 md3>
                <v-btn
                  :href="
                    `https://untappd.com/search?q='${encodeURIComponent(
                      props.item.name
                    )}'`
                  "
                  target="_BLANK"
                  color="amber darken-1"
                  >View on Untappd</v-btn
                >
              </v-flex>
            </v-layout>
          </v-card-text>
        </v-card>
      </template>
    </v-data-table>
  </v-card>
</template>

<script>
import UserAvatar from "@/components/UserAvatar.vue";
import { mapState } from "vuex";

export default {
  name: "TapList",
  components: { UserAvatar },
  data() {
    return {
      headers: [
        { sortable: false },
        {
          text: "Beer Name",
          align: "left",
          sortable: true,
          value: "name"
        },
        { text: "Checkins", value: "checkins.length" },
        { text: "Location", value: "location", class: ["hidden-header"] },
        { text: "Users", value: "checkins", class: ["hidden-header"] }
      ]
    };
  },
  computed: {
    ...mapState(["taplist", "users", "loading", "untappd"]),
    search: {
      get() {
        return this.$store.state.search;
      },
      set(search) {
        this.$store.commit("SET_SEARCH", search);
      }
    }
  },
  methods: {
    clicked(props) {
      let storage = window.localStorage;
      let beer = JSON.parse(storage.getItem(props.item.name));
      if (beer) {
        this.$set(props.item, "beer", beer);
      }

      let url = `https://api.untappd.com/v4/search/beer?q=${
        props.item.name
      }&access_token=${this.untappd}`;

      if (!props.item.beer && !props.item.error) {
        this.$set(props.item, "loading", true);
        fetch(url)
          .then(response => response.json())
          .then(json => {
            if (json.response.beers.count > 0) {
              const bid = json.response.beers.items[0].beer.bid;
              fetch(
                `https://api.untappd.com/v4/beer/info/${bid}?access_token=${
                  this.untappd
                }`
              )
                .then(resp => resp.json())
                .then(json => {
                  const beer = json.response.beer;
                  this.$set(props.item, "beer", beer);
                  storage.setItem(props.item.name, JSON.stringify(beer));
                  this.$set(props.item, "loading", false);
                  props.expanded = !props.expanded;
                });
            } else {
              props.item.error = "Untappd rating not found.";
              props.item.beer.rating_score = 0;
              this.$set(props.item, "loading", false);
              props.expanded = !props.expanded;
            }
          });
      } else {
        props.expanded = !props.expanded;
      }
    }
  },
  watch: {
    $route: {
      immediate: true,
      handler() {
        if (this.$route.params.name) {
          this.search = this.$route.params.name;
        } else {
          this.search = null;
        }
      }
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
tr.beer-row {
  cursor: pointer;
}
tr.beer-row td.hidden {
  display: none;
}
th.hidden-header {
  display: none;
}
tr.beer-row.expanded div.v-avatar {
  display: none;
}
tr.beer-row:not(.expanded) div.v-avatar {
  margin-left: -26px !important;
}
</style>
