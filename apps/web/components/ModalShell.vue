<script setup lang="ts">
defineProps<{ title: string; open: boolean }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
      <section class="modal-card" role="dialog" aria-modal="true" :aria-label="title">
        <header><div><span class="eyebrow">Akros Pulse</span><h2>{{ title }}</h2></div><button class="icon-button" @click="$emit('close')">×</button></header>
        <slot />
      </section>
    </div>
  </Teleport>
</template>
