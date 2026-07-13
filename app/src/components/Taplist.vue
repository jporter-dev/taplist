<template>
  <v-card>
    <v-card-title class="d-flex flex-wrap align-center ga-2">
      <h3 class="text-h6">
        {{ venueFilter ?? "Local Taplist" }}
        <v-btn
          v-if="venueUrl"
          :href="venueUrl"
          target="_blank"
          rel="noopener noreferrer"
          icon="mdi-open-in-new"
          size="x-small"
          variant="text"
          title="Open the venue's taplist"
          class="ml-1"
        ></v-btn>
      </h3>
      <v-spacer></v-spacer>
      <v-text-field
        v-model="store.search"
        append-inner-icon="mdi-magnify"
        label="Search"
        single-line
        hide-details
        density="compact"
        class="flex-grow-1"
        style="max-width: 400px; min-width: 180px"
      ></v-text-field>
    </v-card-title>
    <div class="d-flex align-center px-2">
      <v-chip-group v-model="styleFilter" multiple filter class="flex-grow-1">
        <v-chip
          v-for="style in styleGroups"
          :key="style"
          :value="style"
          size="small"
        >
          {{ style }}
        </v-chip>
      </v-chip-group>
      <v-chip
        v-if="auth.token && wishlistBids.size > 0"
        size="small"
        variant="tonal"
        prepend-icon="mdi-heart"
        :color="wishlistOnly ? 'red-lighten-1' : undefined"
        class="flex-shrink-0 mr-2"
        @click="wishlistOnly = !wishlistOnly"
      >
        Wishlist
      </v-chip>
    </div>
    <v-data-table
      :headers="headers"
      :items="items"
      :search="store.search"
      :loading="store.loading"
      :items-per-page="25"
      :items-per-page-options="[25, 50, 100]"
      :sort-by="[{ key: 'name', order: 'asc' }]"
      item-value="id"
      show-expand
      v-model:expanded="expanded"
      @click:row="onRowClick"
    >
      <template #item.name="{ item }">
        <v-icon
          v-if="item.wishlisted"
          color="red-lighten-1"
          size="x-small"
          class="mr-1"
          title="On your Untappd wishlist"
        >
          mdi-heart
        </v-icon>
        {{ item.name }}
        <v-chip
          v-if="item.isNew"
          color="green"
          size="x-small"
          variant="tonal"
          class="ml-1"
        >
          NEW
        </v-chip>
        <div v-if="!mdAndUp && item.style" class="text-caption text-grey">
          {{ item.style }}
        </div>
      </template>
      <template #item.abv="{ item }">
        {{ item.abv ? `${Number(item.abv).toFixed(1)}%` : "" }}
      </template>
      <template #item.rating="{ item }">
        <v-progress-circular
          v-if="details[item.id]?.loading"
          indeterminate
          color="amber"
          size="20"
        ></v-progress-circular>
        <template v-else-if="mdAndUp">
          <v-rating
            :model-value="ratingFor(item)"
            color="yellow-darken-3"
            density="compact"
            size="small"
            readonly
            half-increments
          ></v-rating>
          <span class="text-grey-lighten-2 text-caption ml-2">
            ({{ ratingFor(item)?.toFixed(2) ?? "Click to load" }})
          </span>
        </template>
        <template v-else>
          {{ ratingFor(item)?.toFixed(2) }}
        </template>
      </template>
      <template #expanded-row="{ columns, item }">
        <tr>
          <td :colspan="columns.length" class="pa-0">
            <div class="beer-details d-flex ga-4 pa-4 bg-grey-darken-4">
              <v-avatar
                v-if="beerFor(item)?.beer_label"
                :image="beerFor(item).beer_label"
                size="72"
                rounded="lg"
                class="flex-shrink-0 d-none d-sm-flex"
              ></v-avatar>
              <div class="flex-grow-1" style="min-width: 0">
                <v-progress-linear
                  v-if="details[item.id]?.loading"
                  indeterminate
                  color="amber"
                  class="mb-2"
                ></v-progress-linear>
                <div
                  v-if="beerMeta(item).length"
                  class="text-body-2 text-grey-lighten-1 mb-2"
                >
                  {{ beerMeta(item).join(" · ") }}
                </div>
                <p
                  v-if="beerFor(item)?.beer_description"
                  class="beer-description text-body-2 text-grey-lighten-2 mb-3"
                >
                  {{ beerFor(item).beer_description }}
                </p>
                <div
                  v-if="details[item.id]?.error"
                  class="text-body-2 text-red-lighten-3 mb-2"
                >
                  {{ details[item.id].error }}
                </div>
                <div class="d-flex flex-wrap align-center ga-4">
                  <div v-if="auth.token && beerFor(item)">
                    <div class="text-caption text-grey">Your rating</div>
                    <div class="d-flex align-center">
                      <v-rating
                        :model-value="beerFor(item).auth_rating ?? 0"
                        color="yellow-darken-3"
                        density="compact"
                        size="x-small"
                        readonly
                        half-increments
                      ></v-rating>
                      <span class="text-caption text-grey-lighten-2 ml-2">
                        {{ formatRating(beerFor(item).auth_rating) }}
                      </span>
                    </div>
                  </div>
                  <div v-if="beerFor(item)">
                    <div class="text-caption text-grey">Global rating</div>
                    <div class="d-flex align-center">
                      <v-rating
                        :model-value="beerFor(item).rating_score"
                        color="yellow-darken-3"
                        density="compact"
                        size="x-small"
                        readonly
                        half-increments
                      ></v-rating>
                      <span class="text-caption text-grey-lighten-2 ml-2">
                        {{ formatRating(beerFor(item).rating_score) }}
                      </span>
                    </div>
                  </div>
                  <v-spacer></v-spacer>
                  <div class="d-flex ga-2">
                    <v-btn
                      :href="untappdURL(item)"
                      target="_blank"
                      rel="noopener noreferrer"
                      color="primary"
                      variant="tonal"
                      size="small"
                      prepend-icon="mdi-open-in-new"
                    >
                      Untappd
                    </v-btn>
                    <v-btn
                      variant="tonal"
                      size="small"
                      prepend-icon="mdi-refresh"
                      @click="loadDetails(item, true)"
                    >
                      Reload
                    </v-btn>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useDisplay } from "vuetify";
import { useTaplistStore } from "../stores/taplist";
import { useAuthStore } from "../stores/auth";
import { useBeerDetails } from "../composables/useBeerDetails";
import { useWishlist } from "../composables/useWishlist";

const NEW_WINDOW_MS = 48 * 60 * 60 * 1000;

const store = useTaplistStore();
const auth = useAuthStore();
const route = useRoute();
const { mdAndUp } = useDisplay();
const { getBeer } = useBeerDetails();
const { bids: wishlistBids } = useWishlist();

const headers = computed(() => {
  const rating = {
    title: "Rating",
    key: "rating",
    sort: nullsLast,
  };
  if (!mdAndUp.value) {
    return [{ title: "Beer Name", key: "name", align: "start" }, rating];
  }
  return [
    { title: "Beer Name", key: "name", align: "start" },
    { title: "Style", key: "style" },
    { title: "ABV", key: "abv", sort: nullsLast },
    rating,
  ];
});

function nullsLast(a, b) {
  return (a ?? -1) - (b ?? -1);
}

const expanded = ref([]);
// item.id -> { loading, beer, error }
const details = reactive({});
const styleFilter = ref([]);
const wishlistOnly = ref(false);

const venueFilter = computed(() =>
  route.params.name ? decodeURIComponent(route.params.name) : null
);

const venueUrl = computed(() =>
  venueFilter.value ? store.data?.venues?.[venueFilter.value]?.url : null
);

// The index dedupes beers pouring at several venues into one row and
// lists every venue in location; venue pages keep per-venue rows.
const baseItems = computed(() => {
  if (venueFilter.value) {
    return store.beers
      .filter((b) => b.location === venueFilter.value)
      .map(decorate);
  }
  const byName = new Map();
  for (const beer of store.beers) {
    const existing = byName.get(beer.name);
    if (existing) {
      existing.location += `, ${beer.location}`;
      // Only new if its first appearance anywhere is recent.
      existing.first_seen =
        existing.first_seen && beer.first_seen
          ? Math.min(existing.first_seen, beer.first_seen)
          : null;
    } else byName.set(beer.name, { ...beer });
  }
  return [...byName.values()].map(decorate);
});

function decorate(beer) {
  const untappd = beer.untappd;
  return {
    ...beer,
    rating: untappd?.rating ?? null,
    style: untappd?.style ?? null,
    styleGroup: untappd?.style?.split(" -")[0] ?? null,
    abv: untappd?.abv ?? null,
    isNew: !!beer.first_seen && Date.now() - beer.first_seen < NEW_WINDOW_MS,
    wishlisted: !!untappd?.bid && wishlistBids.value.has(untappd.bid),
  };
}

const styleGroups = computed(() => {
  const counts = new Map();
  for (const item of baseItems.value) {
    if (item.styleGroup)
      counts.set(item.styleGroup, (counts.get(item.styleGroup) ?? 0) + 1);
  }
  return [...counts.keys()].sort(
    (a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b)
  );
});

const items = computed(() => {
  let list = baseItems.value;
  if (styleFilter.value.length > 0) {
    list = list.filter((b) => styleFilter.value.includes(b.styleGroup));
  }
  if (wishlistOnly.value) list = list.filter((b) => b.wishlisted);
  return list;
});

function ratingFor(item) {
  return details[item.id]?.beer?.rating_score ?? item.rating;
}

function beerFor(item) {
  return details[item.id]?.beer ?? null;
}

function beerMeta(item) {
  const beer = beerFor(item);
  return [
    beer?.beer_style ?? item.style,
    beer?.beer_abv ? `${beer.beer_abv}% ABV` : null,
    beer?.brewery?.brewery_name,
    item.location,
  ].filter(Boolean);
}

function formatRating(value) {
  return value ? Number(value).toFixed(2) : "N/A";
}

function untappdURL(item) {
  const bid = details[item.id]?.beer?.bid ?? item.untappd?.bid;
  if (bid && navigator.userAgent.toLowerCase().match(/mobile/i))
    return `untappd://beer/${bid}`;
  return `https://untappd.com/search?q=${encodeURIComponent(item.name)}`;
}

async function loadDetails(item, reload = false) {
  if (!reload && (details[item.id]?.beer || details[item.id]?.loading)) return;
  details[item.id] = { loading: true, beer: null, error: null };
  try {
    details[item.id].beer = await getBeer(item.name, { reload });
  } catch (error) {
    details[item.id].error = error.message;
  } finally {
    details[item.id].loading = false;
  }
}

function onRowClick(_event, { item }) {
  const index = expanded.value.indexOf(item.id);
  expanded.value =
    index >= 0
      ? expanded.value.filter((id) => id !== item.id)
      : [...expanded.value, item.id];
}

watch(expanded, (ids) => {
  for (const id of ids) {
    const item = items.value.find((b) => b.id === id);
    if (item) loadDetails(item);
  }
});
</script>

<style>
.v-data-table tbody tr {
  cursor: pointer;
}
.beer-description {
  max-width: 65ch;
}
</style>
