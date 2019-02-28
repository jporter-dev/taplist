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
        <td>{{ props.item.name }}</td>
        <td>{{ props.item.location }}</td>
        <td>{{ true }}</td>
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
