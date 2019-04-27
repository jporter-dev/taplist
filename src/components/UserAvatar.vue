<template>
  <v-tooltip top>
    <template v-slot:activator="{ on }">
      <v-avatar
        v-on="on"
        :size="34"
        color="grey lighten-4"
        class="mx-1 untappd-avatar"
      >
        <img
          v-if="user && user.hasOwnProperty('avatar')"
          :src="user.avatar"
          alt="avatar"
        />
        <img
          v-else
          src="https://gravatar.com/avatar/11dd43125b7d27f3a8e4e73144451072?size=125&d=https%3A%2F%2Funtappd.akamaized.net%2Fsite%2Fassets%2Fimages%2Fdefault_avatar_v3_gravatar.jpg%3Fv%3D2"
          alt="avatar"
        />
      </v-avatar>
    </template>
    <span>{{ user ? user.username : "" }}</span>
  </v-tooltip>
</template>

<script>
export default {
  name: "UserAvatar",
  props: ["user"]
};
</script>
<style>
.untappd-avatar img {
  border: 1px solid #eee;
}
</style>
