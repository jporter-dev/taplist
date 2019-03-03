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
          <v-card-title>
            <user-avatar
              transition="fade-transition"
              v-for="username in props.item.checkins"
              :key="username"
              :user="users[username]"
            >
            </user-avatar>
          </v-card-title>
          <v-card-text>
            <v-layout row wrap>
              <v-flex xs6>
                <h3>Location</h3>
                <p>{{ props.item.location }}</p>
              </v-flex>
              <v-flex xs6>
                <h3>Rating</h3>
                <v-rating
                  v-model="props.item.rating"
                  color="yellow darken-3"
                  small
                  readonly
                  half-increments
                ></v-rating>
              </v-flex>
              <v-flex xs6></v-flex>
              <v-flex xs6>
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
      props.item.loading = true;
      let url =
        process.env.NODE_ENV === "development"
          ? `http://localhost:8010/proxy/search?q=${props.item.name}`
          : `/untappd/search?q=${props.item.name}`;
      fetch(url)
        .then(response => response.text())
        .then(html => {
          // Initialize the DOM parser
          var parser = new DOMParser();
          // Parse the text
          var doc = parser.parseFromString(html, "text/html");
          try {
            props.item.rating = parseFloat(
              doc
                .querySelector(
                  ".beer-item > .beer.details > p.rating > span.num"
                )
                .innerText.replace(/[()]/g, "")
            );
          } catch (error) {
            props.item.rating = 0;
          }
          props.expanded = !props.expanded;
          props.item.loading = false;
        });
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
tr.beer-row:not(.expanded) div.v-avatar {
  margin-left: -26px !important;
}
th.hidden-header {
  display: none;
}
</style>
