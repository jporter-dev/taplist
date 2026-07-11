<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <h3 class="hidden-sm-and-down">
        {{ venueFilter ?? "Local Taplist" }}
      </h3>
      <v-spacer class="hidden-sm-and-down"></v-spacer>
      <v-text-field
        v-model="store.search"
        append-inner-icon="mdi-magnify"
        label="Search"
        single-line
        hide-details
        density="compact"
        style="max-width: 400px"
      ></v-text-field>
    </v-card-title>
    <v-data-table
      :headers="headers"
      :items="items"
      :search="store.search"
      :loading="store.loading"
      :items-per-page="25"
      :items-per-page-options="[25, 50, 100]"
      item-value="id"
      show-expand
      v-model:expanded="expanded"
      @click:row="onRowClick"
    >
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
            <v-card flat color="grey-darken-4">
              <v-card-text>
                <v-row v-if="details[item.id]?.beer?.beer_description" justify="center">
                  <v-col cols="12" md="6" class="my-2">
                    <h3 class="mb-2">Description</h3>
                    {{ details[item.id].beer.beer_description }}
                  </v-col>
                </v-row>
                <v-row justify="center">
                  <v-col v-if="auth.token" cols="6" md="3">
                    <h3>
                      Your Rating
                      <span
                        class="text-caption"
                        v-if="details[item.id]?.beer?.stats"
                      >
                        ({{
                          details[item.id].beer.stats.user_count === 0
                            ? "N/A"
                            : details[item.id].beer.auth_rating
                        }})
                      </span>
                    </h3>
                    <v-rating
                      v-if="details[item.id]?.beer"
                      :model-value="details[item.id].beer.auth_rating"
                      color="yellow-darken-3"
                      size="small"
                      readonly
                      half-increments
                    ></v-rating>
                  </v-col>
                  <v-col cols="6" md="3">
                    <h3>
                      Global Rating
                      <span class="text-caption" v-if="details[item.id]?.beer">
                        ({{ details[item.id].beer.rating_score }})
                      </span>
                    </h3>
                    <v-rating
                      v-if="details[item.id]?.beer"
                      :model-value="details[item.id].beer.rating_score"
                      color="yellow-darken-3"
                      size="small"
                      readonly
                      half-increments
                    ></v-rating>
                    <span class="text-red-lighten-3">
                      {{ details[item.id]?.error }}
                    </span>
                  </v-col>
                </v-row>
                <v-row justify="center">
                  <v-col cols="6" md="3">
                    <h3>Style</h3>
                    <p v-if="details[item.id]?.beer">
                      {{ details[item.id].beer.beer_style }}
                    </p>
                    <h3 class="mt-2">Location</h3>
                    <p>{{ item.location }}</p>
                  </v-col>
                  <v-col cols="6" md="3">
                    <v-btn
                      :href="untappdURL(item)"
                      target="_blank"
                      rel="noopener noreferrer"
                      color="primary"
                      block
                      class="mb-2"
                    >
                      View on Untappd
                    </v-btn>
                    <v-btn block color="secondary" @click="loadDetails(item, true)">
                      Reload Rating
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
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

const store = useTaplistStore();
const auth = useAuthStore();
const route = useRoute();
const { mdAndUp } = useDisplay();
const { getBeer } = useBeerDetails();

const headers = [
  { title: "Beer Name", key: "name", align: "start" },
  { title: "Rating", key: "rating", sortable: false },
];

const expanded = ref([]);
// item.id -> { loading, beer, error }
const details = reactive({});

const venueFilter = computed(() =>
  route.params.name ? decodeURIComponent(route.params.name) : null
);

const items = computed(() =>
  venueFilter.value
    ? store.beers.filter((b) => b.location === venueFilter.value)
    : store.beers
);

function ratingFor(item) {
  return details[item.id]?.beer?.rating_score ?? null;
}

function untappdURL(item) {
  const bid = details[item.id]?.beer?.bid;
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

// On a venue page, logged-in users get ratings prefetched for the whole
// venue (their own token + localStorage cache absorb the cost).
watch(
  [venueFilter, () => store.loading],
  ([venue, loading]) => {
    if (venue && !loading && auth.token) {
      for (const item of items.value) loadDetails(item);
    }
  },
  { immediate: true }
);
</script>

<style>
.v-data-table tbody tr {
  cursor: pointer;
}
</style>
