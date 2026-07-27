<script setup lang="ts">
const props = withDefaults(defineProps<{
  options: Array<{ value: string; label: string; detail?: string }>;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  exclusiveAllValue?: string;
}>(), {
  placeholder: "Buscar…",
  emptyText: "Nenhuma opção encontrada.",
  disabled: false,
  exclusiveAllValue: ""
});
const model = defineModel<string[]>({ default: () => [] });
const search = ref("");
const filtered = computed(() => {
  const query = search.value.trim().toLowerCase();
  return query
    ? props.options.filter((option) => `${option.label} ${option.detail || ""}`.toLowerCase().includes(query))
    : props.options;
});

function toggle(value: string) {
  if (props.disabled) return;
  if (props.exclusiveAllValue && value === props.exclusiveAllValue) {
    model.value = model.value.includes(value) ? [] : [value];
    return;
  }
  const next = model.value.filter((item) => item !== props.exclusiveAllValue);
  model.value = next.includes(value) ? next.filter((item) => item !== value) : [...next, value];
}
</script>

<template>
  <div class="search-toggle-list" :class="{ disabled }">
    <label class="toggle-search"><AppIcon name="filter" :size="17" /><input v-model="search" :placeholder="placeholder" /></label>
    <div class="toggle-options">
      <button
        v-for="option in filtered"
        :key="option.value"
        type="button"
        class="toggle-option"
        :class="{ selected: model.includes(option.value) }"
        :disabled="disabled"
        :aria-pressed="model.includes(option.value)"
        @click="toggle(option.value)"
      >
        <span class="toggle-switch"><i /></span>
        <span><strong>{{ option.label }}</strong><small v-if="option.detail">{{ option.detail }}</small></span>
      </button>
      <p v-if="!filtered.length" class="toggle-empty">{{ emptyText }}</p>
    </div>
  </div>
</template>
