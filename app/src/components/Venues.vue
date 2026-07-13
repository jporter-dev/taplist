<template>
  <v-list v-if="!store.loading && venues.length > 0">
    <v-list-subheader>{{ title }}</v-list-subheader>
    <template v-for="venue in venues" :key="venue.name">
      <v-list-item :to="`/venue/${encodeURIComponent(venue.name)}`">
        <template #prepend>
          <v-btn
            icon
            variant="text"
            size="small"
            @click.prevent.stop="store.toggleFavorite(venue.name)"
          >
            <v-icon v-if="store.favorites[venue.name]" color="yellow-darken-3">
              mdi-star
            </v-icon>
            <v-icon v-else>mdi-star-outline</v-icon>
          </v-btn>
        </template>
        <v-list-item-title>
          <v-icon
            v-if="store.isVenueStale(venue.name)"
            color="amber"
            size="x-small"
            class="mr-1"
            title="Taplist may be out of date"
          >
            mdi-clock-alert-outline
          </v-icon>
          {{ venue.name }}
        </v-list-item-title>
        <template #append>
          <v-chip
            v-if="venue.avgRating"
            size="small"
            prepend-icon="mdi-star"
            class="mr-1"
            title="Average Untappd rating"
          >
            {{ venue.avgRating }}
          </v-chip>
          <v-chip size="small">{{ venue.count }}</v-chip>
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
  const stats = {};
  for (const beer of store.beers) {
    const fav = !!store.favorites[beer.location];
    if (props.favs !== fav) continue;
    const entry = (stats[beer.location] ??= {
      name: beer.location,
      count: 0,
      ratingSum: 0,
      rated: 0,
    });
    entry.count++;
    if (beer.untappd?.rating) {
      entry.ratingSum += beer.untappd.rating;
      entry.rated++;
    }
  }
  return Object.values(stats)
    .map((entry) => ({
      ...entry,
      avgRating: entry.rated ? (entry.ratingSum / entry.rated).toFixed(1) : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
});
</script>
