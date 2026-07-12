<template>
  <v-list v-if="!store.loading && Object.keys(venues).length > 0">
    <v-list-subheader>{{ title }}</v-list-subheader>
    <template v-for="(total, venue) in venues" :key="venue">
      <v-list-item :to="`/venue/${encodeURIComponent(venue)}`">
        <template #prepend>
          <v-btn
            icon
            variant="text"
            size="small"
            @click.prevent.stop="store.toggleFavorite(venue)"
          >
            <v-icon v-if="store.favorites[venue]" color="yellow-darken-3">
              mdi-star
            </v-icon>
            <v-icon v-else>mdi-star-outline</v-icon>
          </v-btn>
        </template>
        <v-list-item-title>{{ venue }}</v-list-item-title>
        <template #append>
          <v-chip size="small">{{ total }}</v-chip>
        </template>
      </v-list-item>
      <v-divider></v-divider>
    </template>
  </v-list>
</template>

<script setup>
import { computed } from "vue";
import { useTaplistStore } from "../stores/taplist";

const props = defineProps({
  title: { type: String, default: "Nearby Venues" },
  favs: { type: Boolean, default: false },
});

const store = useTaplistStore();

const venues = computed(() => {
  const counts = {};
  for (const beer of store.beers) {
    const fav = !!store.favorites[beer.location];
    if (props.favs !== fav) continue;
    counts[beer.location] = (counts[beer.location] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.keys(counts)
      .sort()
      .map((venue) => [venue, counts[venue]])
  );
});
</script>
