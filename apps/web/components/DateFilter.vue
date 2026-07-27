<script setup lang="ts">
const props = defineProps<{ start: string; end: string }>();
const emit = defineEmits<{ apply: [start: string, end: string] }>();
const localStart = ref(props.start);
const localEnd = ref(props.end);
watch(() => props.start, (value) => (localStart.value = value));
watch(() => props.end, (value) => (localEnd.value = value));
</script>

<template>
  <form class="date-filter" @submit.prevent="emit('apply', localStart, localEnd)">
    <label>Início <input v-model="localStart" type="date" required /></label>
    <span aria-hidden="true">→</span>
    <label>Fim <input v-model="localEnd" type="date" :min="localStart" required /></label>
    <button class="button subtle" type="submit">Aplicar período</button>
  </form>
</template>
