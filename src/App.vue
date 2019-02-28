<template>
  <v-app dark>
    <v-navigation-drawer
      app
      v-model="drawer"
      :clipped="$vuetify.breakpoint.lgAndUp"
      fixed
    >
      <venues></venues>
    </v-navigation-drawer>
    <v-toolbar app fixed :clipped-left="$vuetify.breakpoint.lgAndUp">
      <v-toolbar-title>
        <v-toolbar-side-icon
          @click.stop="drawer = !drawer"
        ></v-toolbar-side-icon>
        <span class="hidden-sm-and-down ml-4">Baltimore Beer Finder</span>
      </v-toolbar-title>
    </v-toolbar>
    <v-content>
      <v-container fluid>
        <router-view></router-view>
      </v-container>
    </v-content>
    <v-footer app>
      <v-flex text-xs-center xs12>
        <strong>Taplist updated daily.</strong> Last update: {{ last_updated }}.
      </v-flex>
    </v-footer>
  </v-app>
</template>
<script>
import Venues from "@/components/Venues.vue";
import { mapState } from "vuex";
export default {
  components: { Venues },
  computed: {
    ...mapState(["last_updated"]),
    drawer: {
      get() {
        return this.$store.state.drawer;
      },
      set(val) {
        this.$store.commit("SET_DRAWER", val);
      }
    }
  }
};
</script>

<style lang="scss"></style>
