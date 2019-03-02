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
    >
      <template slot="items" slot-scope="props">
        <td>
          <a
            :href="
              `https://untappd.com/search?q=${encodeURIComponent(
                props.item.name
              )}`
            "
            target="_BLANK"
            class="white--text"
          >
            {{ props.item.name }}
          </a>
        </td>
        <td>{{ props.item.location }}</td>
        <td>
          <v-avatar
            :size="30"
            color="grey lighten-4"
            v-if="Math.random() > 0.5"
          >
            <img :src="users['-josh'].avatar" alt="avatar" />
          </v-avatar>
        </td>
      </template>
    </v-data-table>
  </v-card>
</template>

<script>
import { mapState } from "vuex";
export default {
  name: "TapList",
  data() {
    return {
      users: {
        "-josh": {
          avatar:
            "https://untappd.akamaized.net/profile/d22a4c0d119e3d2014bd2ed0e13a7156_100x100.jpg"
        }
      },
      headers: [
        {
          text: "Beer Name",
          align: "left",
          sortable: true,
          value: "name"
        },
        { text: "Location", value: "location" },
        { text: "Unique", value: "unique" }
      ]
    };
  },
  computed: {
    ...mapState(["taplist"]),
    search: {
      get() {
        return this.$store.state.search;
      },
      set(search) {
        this.$store.commit("SET_SEARCH", search);
      }
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>