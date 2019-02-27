<template>
  <v-app dark>
    <v-navigation-drawer app>
      <venues></venues>
    </v-navigation-drawer>
    <!-- <v-toolbar app></v-toolbar> -->
    <v-content>
      <v-container fluid>
        <router-view></router-view>
      </v-container>
    </v-content>
    <v-footer app></v-footer>
  </v-app>
</template>
<script>
import Venues from "@/components/Venues.vue";

export default {
  components: { Venues }
};
</script>

<style lang="scss"></style>
