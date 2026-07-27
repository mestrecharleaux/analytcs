<script setup lang="ts">
defineProps<{ label: string; value: string | number; detail?: string; tone?: string }>();
</script>

<template>
  <article class="metric-card">
    <span class="metric-dot" :style="{ background: tone || '#2e6f78' }" />
    <p>{{ label }}</p>
    <strong>{{ value }}</strong>
    <small v-if="detail">{{ detail }}</small>
  </article>
</template>
