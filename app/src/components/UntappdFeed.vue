<template>
  <v-list v-if="auth.user" lines="three">
    <v-list-subheader>
      {{ auth.user.user_name }}'s Recent Check-ins
    </v-list-subheader>
    <v-list-item
      v-for="item in auth.user.checkins.items"
      :key="item.checkin_id"
      target="_blank"
      rel="noopener noreferrer"
      :href="`https://untappd.com/user/${auth.user.user_name}/checkin/${item.checkin_id}`"
    >
      <template #prepend>
        <v-avatar>
          <v-img :src="item.beer.beer_label"></v-img>
        </v-avatar>
      </template>
      <v-list-item-title>{{ item.beer.beer_name }}</v-list-item-title>
      <v-list-item-subtitle>{{ item.brewery.brewery_name }}</v-list-item-subtitle>
      <v-list-item-subtitle class="d-flex align-center">
        <v-rating
          :model-value="item.rating_score"
          color="yellow-darken-3"
          density="compact"
          size="x-small"
          readonly
          half-increments
        ></v-rating>
        <span class="text-grey-lighten-2 text-caption ml-2">
          ({{ item.rating_score }})
        </span>
      </v-list-item-subtitle>
    </v-list-item>
  </v-list>
</template>

<script setup>
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
</script>
