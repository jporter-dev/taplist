<template>
  <v-list>
    <v-subheader>Checkin Leaderboard</v-subheader>
    <template v-for="(count, name) in leaderboard">
      <v-list-tile :key="name + 'tile'">
        <v-list-tile-avatar>
          <user-avatar :user="users[name]"></user-avatar>
        </v-list-tile-avatar>
        <v-list-tile-content>
          {{ users[name].name }}
        </v-list-tile-content>
        <v-list-tile-action>
          <v-chip>{{ count }}</v-chip>
        </v-list-tile-action>
      </v-list-tile>
      <v-divider :key="name + 'divider'"></v-divider>
    </template>
  </v-list>
</template>

<script>
import UserAvatar from "@/components/UserAvatar.vue";
import { mapState } from "vuex";

export default {
  name: "Leaderboard",
  components: { UserAvatar },
  computed: {
    ...mapState(["leaderboard", "users"])
  }
};
</script>
