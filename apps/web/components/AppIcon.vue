<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number; strokeWidth?: number }>(), {
  size: 20,
  strokeWidth: 1.8
});
</script>

<template>
  <svg
    aria-hidden="true"
    class="app-icon"
    fill="none"
    :height="size"
    viewBox="0 0 24 24"
    :width="size"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    :stroke-width="strokeWidth"
  >
    <template v-if="name === 'sites'">
      <rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" />
    </template>
    <template v-else-if="name === 'chart'">
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
    </template>
    <template v-else-if="name === 'recording'">
      <rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="12" cy="12" r="3.5" />
      <path d="M18 3v4M6 3v4" />
    </template>
    <template v-else-if="name === 'campaign'">
      <path d="m3 11 15-6v14L3 13zM11.6 16.4 13 21H7l-1.5-6M21 9v6" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </template>
    <template v-else-if="name === 'code'">
      <path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" />
    </template>
    <template v-else-if="name === 'arrow'"><path d="m9 18 6-6-6-6" /></template>
    <template v-else-if="name === 'plus'"><path d="M12 5v14M5 12h14" /></template>
    <template v-else-if="name === 'filter'"><path d="M4 5h16l-6 7v5l-4 2v-7z" /></template>
    <template v-else-if="name === 'moon'"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" /></template>
    <template v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </template>
    <template v-else><path d="M3 12h4l2-7 4 14 2-7h6" /></template>
  </svg>
</template>
