<template>
  <v-btn v-if="!auth.token" :href="loginUrl">{{ label }}</v-btn>
  <v-btn v-else :block="block" @click="auth.logout()">Log Out</v-btn>
</template>

<script setup>
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

defineProps({
  label: { type: String, default: "Log In with Untappd" },
  block: { type: Boolean, default: false },
});

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

// Must exactly match the worker's OAUTH_REDIRECT_URL for the code exchange.
const redirectUrl = `${window.location.origin}/`;
const loginUrl =
  `https://untappd.com/oauth/authenticate/?client_id=${import.meta.env.VITE_UNTAPPD_CLIENT_ID}` +
  `&response_type=code&redirect_url=${encodeURIComponent(redirectUrl)}`;

onMounted(async () => {
  // route.query is empty until the router resolves the initial navigation.
  await router.isReady();
  if (!auth.token && route.query.code) {
    try {
      await auth.loginWithCode(route.query.code);
    } catch (error) {
      console.error("Untappd login failed:", error);
    } finally {
      router.replace({ query: {} });
    }
  }
});
</script>
