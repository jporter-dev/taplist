<template>
  <div class="home">
    <taplist v-if="$store.state.taplist"></taplist>
  </div>
</template>

<script>
import Taplist from "@/components/Taplist.vue";

export default {
  name: "home",
  components: { Taplist }
};
</script>
