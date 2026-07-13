<template>
  <v-app>
    <v-navigation-drawer v-model="drawer">
      <venues title="Favorite Venues" favs></venues>
      <venues></venues>
    </v-navigation-drawer>
    <v-navigation-drawer v-model="rightDrawer" location="right">
      <settings></settings>
    </v-navigation-drawer>
    <v-app-bar color="primary">
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-spacer></v-spacer>
      <v-btn icon to="/" :active="false">
        <img src="./assets/logo-color-64x64.png" alt="Beer" height="32" />
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn v-if="auth.token" icon @click.stop="rightDrawer = !rightDrawer">
        <v-avatar v-if="auth.user" size="34">
          <v-img :src="auth.user.user_avatar" alt="avatar"></v-img>
        </v-avatar>
        <v-icon v-else>mdi-account-circle</v-icon>
      </v-btn>
      <untappd-auth v-else label="Login" class="mr-2"></untappd-auth>
    </v-app-bar>
    <v-main>
      <v-container fluid>
        <router-view></router-view>
      </v-container>
    </v-main>
    <v-footer app :color="taplist.isStale ? 'red-lighten-1' : undefined">
      <div class="text-center w-100">
        <span><b>Last update</b>: {{ taplist.lastUpdated ?? "loading…" }}</span>
      </div>
    </v-footer>
  </v-app>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import Venues from "./components/Venues.vue";
import Settings from "./components/Settings.vue";
import UntappdAuth from "./components/UntappdAuth.vue";
import { useTaplistStore } from "./stores/taplist";
import { useAuthStore } from "./stores/auth";

const drawer = ref(null);
const rightDrawer = ref(false);
const taplist = useTaplistStore();
const auth = useAuthStore();

onMounted(() => {
  taplist.fetchTaplist();
  if (auth.token && !auth.user) auth.fetchUser();
});

// Retry on drawer open so the avatar recovers from a rate-limited fetch.
watch(rightDrawer, (open) => {
  if (open && auth.token && !auth.user) auth.fetchUser();
});
</script>
