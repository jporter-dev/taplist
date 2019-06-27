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
    <v-navigation-drawer
      app
      v-model="rightDrawer"
      :clipped="$vuetify.breakpoint.lgAndUp"
      fixed
      right
    >
      <settings></settings>
    </v-navigation-drawer>
    <v-toolbar
      app
      fixed
      :clipped-left="$vuetify.breakpoint.lgAndUp"
      :clipped-right="$vuetify.breakpoint.lgAndUp"
    >
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
      <v-spacer></v-spacer>
      <v-toolbar-title>
        <v-toolbar-side-icon @click.stop="rightDrawer = !rightDrawer">
          <v-avatar v-if="untappd_user" :size="34">
            <img :src="untappd_user.user_avatar" alt="avatar" />
          </v-avatar>
          <v-icon v-else>person</v-icon>
        </v-toolbar-side-icon>
      </v-toolbar-title>
    </v-toolbar>
    <v-content>
      <v-container fluid>
        <v-alert :value="true" type="warning">
          Checkin data currently disabled.
        </v-alert>
        <router-view></router-view>
      </v-container>
    </v-content>
    <v-footer app :color="needsUpdate ? 'red lighten-1' : null">
      <v-flex text-xs-center xs12>
        <span> <b>Last update</b>: {{ last_updated }} </span>
      </v-flex>
    </v-footer>
  </v-app>
</template>
<script>
import Venues from "@/components/Venues.vue";
import Settings from "@/components/Settings.vue";
import { mapState } from "vuex";
export default {
  components: { Venues, Settings },
  computed: {
    ...mapState(["last_updated", "last_updated_timestamp", "untappd_user"]),
    needsUpdate() {
      if (!this.last_updated_timestamp) return false;
      const delta =
        (new Date() - new Date(this.last_updated_timestamp)) / 1000 / 60 / 60;
      return delta > 36;
    },
    drawer: {
      get() {
        return this.$store.state.drawer;
      },
      set(val) {
        this.$store.commit("SET_DRAWER", val);
      }
    },
    rightDrawer: {
      get() {
        return this.$store.state.rightDrawer;
      },
      set(val) {
        this.$store.commit("SET_RIGHT_DRAWER", val);
      }
    }
  }
};
</script>

<style lang="scss"></style>
