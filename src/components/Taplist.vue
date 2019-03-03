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
          <td>
            {{ props.item.name }}
          </td>
          <td>
            <user-avatar
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
                <h3 class="mb-2">Who's had it</h3>
                <user-avatar
                  transition="fade-transition"
                  v-for="username in props.item.checkins"
                  :key="username"
                  :user="users[username]"
                >
                </user-avatar>
              </v-flex>
            </v-layout>
            <v-layout row wrap justify-center>
              <v-flex xs6 md3>
                <h3>Style</h3>
                <p>{{ props.item.style }}</p>
              </v-flex>
              <v-flex xs6 md3>
                <v-layout wrap>
                  <v-flex shrink mr-5>
                    <h3>Rating</h3>
                    <span>{{ props.item.rating }}</span>
                  </v-flex>
                  <v-flex grow>
                    <v-rating
                      v-model="props.item.rating"
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
                <h3>Location</h3>
                <p>{{ props.item.location }}</p></v-flex
              >
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
    ...mapState(["taplist", "users"]),
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
      let rating = storage.getItem(props.item.name);
      if (rating) this.$set(props.item, "rating", parseFloat(rating));
      let style = storage.getItem(`${props.item.name}.style`);
      if (rating) this.$set(props.item, "style", style);

      let url =
        process.env.NODE_ENV === "development"
          ? `http://localhost:8010/proxy/search?q=${props.item.name}`
          : `/untappd/search?q=${props.item.name}`;
      if ((!props.item.rating || !props.item.style) && !props.item.error) {
        fetch(url)
          .then(response => response.text())
          .then(html => {
            // Initialize the DOM parser
            var parser = new DOMParser();
            // Parse the text
            var doc = parser.parseFromString(html, "text/html");
            try {
              let rating = parseFloat(
                doc
                  .querySelector(
                    ".beer-item > .beer.details > p.rating > span.num"
                  )
                  .innerText.replace(/[()]/g, "")
              );
              let style = doc
                .querySelector(".beer-item > .beer-details > p.style")
                .innerText.trim();
              this.$set(props.item, "rating", rating);
              this.$set(props.item, "style", style);

              storage.setItem(props.item.name, props.item.rating);
              storage.setItem(`${props.item.name}.style`, props.item.style);
            } catch (error) {
              props.item.error = "Untappd rating not found.";
              props.item.rating = 0;
            }
            props.expanded = !props.expanded;
          });
      } else {
        props.expanded = !props.expanded;
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
