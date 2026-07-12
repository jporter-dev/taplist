<template>
  <div>
    <untappd-auth v-if="auth.token" block class="ma-2"></untappd-auth>
    <untappd-feed></untappd-feed>
    <v-divider></v-divider>
    <v-btn block variant="text" @click="showTools = !showTools">
      Toggle Developer Tools
    </v-btn>
    <v-expand-transition>
      <div v-show="showTools">
        <v-btn class="ma-2" @click="clearStorage" block color="red-darken-1">
          Clear Local Storage
        </v-btn>
        <v-btn class="ma-2" @click="showUntappdInfo" block color="red-darken-1">
          Show Untappd Info
        </v-btn>
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup>
import { ref } from "vue";
import UntappdAuth from "./UntappdAuth.vue";
import UntappdFeed from "./UntappdFeed.vue";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const showTools = ref(false);

function clearStorage() {
  window.localStorage.clear();
}

function showUntappdInfo() {
  alert(JSON.stringify(auth.user));
}
</script>
