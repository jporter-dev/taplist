<template>
  <v-card>
    <v-card-title>
      Nearby Beers
      <v-spacer></v-spacer>
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
      search: null,
      headers: [
        {
          text: "Beer Name",
          align: "left",
          sortable: false,
          value: "name"
        },
        { text: "Location", value: "location" },
        { text: "Unique", value: "unique" }
      ]
    };
  },
  computed: {
    ...mapState(["taplist"])
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
