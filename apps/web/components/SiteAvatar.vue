<script setup lang="ts">
import type { Site } from "~/types";

defineProps<{ site: Pick<Site, "name" | "icon" | "avatarColor">; size?: "sm" | "md" | "lg" }>();
</script>

<template>
  <span class="site-avatar" :class="size || 'md'" :style="{ background: site.icon ? '' : site.avatarColor }">
    <img v-if="site.icon" :src="site.icon" :alt="`Ícone de ${site.name}`" />
    <span v-else>{{ initials(site.name) }}</span>
  </span>
</template>
