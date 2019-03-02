<template>
  <v-app dark>
    <v-navigation-drawer
      app
      v-model="drawer"
      :clipped="$vuetify.breakpoint.lgAndUp"
      fixed
    >
      <venues></venues>
      <leaderboard></leaderboard>
    </v-navigation-drawer>
    <v-toolbar app fixed :clipped-left="$vuetify.breakpoint.lgAndUp">
      <v-toolbar-title>
        <v-toolbar-side-icon
          @click.stop="drawer = !drawer"
        ></v-toolbar-side-icon>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-title>
        <v-toolbar-side-icon>
          <img src="@/assets/logo-color-64x64.png" alt="Beer" height="32" />
        </v-toolbar-side-icon>
      </v-toolbar-title>
    </v-toolbar>
    <v-content>
      <v-container fluid>
        <router-view></router-view>
      </v-container>
    </v-content>
    <v-footer app>
      <v-flex text-xs-center xs12>
        <strong class="hidden-sm-and-down">Taplist updated daily.</strong>
        <span> Last updated: {{ last_updated }}.</span>
      </v-flex>
    </v-footer>
  </v-app>
</template>
<script>
import Venues from "@/components/Venues.vue";
import Leaderboard from "@/components/Leaderboard.vue";
import { mapState } from "vuex";
export default {
  components: { Venues, Leaderboard },
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
