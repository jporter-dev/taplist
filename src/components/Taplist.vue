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
          <v-tooltip
            top
            v-for="username in props.item.checkins"
            :key="username"
          >
            <template v-slot:activator="{ on }">
              <v-avatar
                v-if="users[username].hasOwnProperty('avatar')"
                v-on="on"
                :size="30"
                color="grey lighten-4"
                class="mx-1"
              >
                <img :src="users[username].avatar" alt="avatar" />
              </v-avatar>
              <v-avatar v-else v-on="on" :size="30" color="grey lighten-4">
                <img
                  src="https://gravatar.com/avatar/4cf0b707ad044bd2dd45bef6a8c6816c?size=125&d=https%3A%2F%2Funtappd.akamaized.net%2Fsite%2Fassets%2Fimages%2Fdefault_avatar_v3_gravatar.jpg%3Fv%3D2"
                  alt="avatar"
                />
              </v-avatar>
            </template>
            <span>{{ username }}</span>
          </v-tooltip>
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
      headers: [
        {
          text: "Beer Name",
          align: "left",
          sortable: true,
          value: "name"
        },
        { text: "Location", value: "location" },
        { text: "Checkins", value: "checkins.length" }
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
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
