<script setup lang="ts">
const route = useRoute();
const sidebarCollapsed = useState("site-sidebar-collapsed", () => true);
const theme = useState<"light" | "dark">("akros-theme", () => "light");
const isSiteArea = computed(() => route.path.startsWith("/sites/"));

function applyTheme() {
  if (!import.meta.client) return;
  document.documentElement.dataset.theme = theme.value;
  localStorage.setItem("akros-pulse-theme", theme.value);
}

function toggleTheme() {
  theme.value = theme.value === "light" ? "dark" : "light";
  applyTheme();
}

onMounted(() => {
  const stored = localStorage.getItem("akros-pulse-theme");
  if (stored === "light" || stored === "dark") theme.value = stored;
  applyTheme();
});
</script>

<template>
  <div class="app-shell" :class="{ 'site-area': isSiteArea, 'sidebar-is-collapsed': sidebarCollapsed }">
    <header class="global-header">
      <NuxtLink v-if="!isSiteArea" class="brand" to="/" aria-label="Akros Pulse">
        <span class="brand-mark"><i /><i /><i /></span>
        <span class="brand-copy"><strong>Akros Pulse</strong><small>Traffic intelligence</small></span>
      </NuxtLink>
      <div v-else class="breadcrumb">
        <NuxtLink to="/">Sites</NuxtLink><AppIcon name="arrow" :size="14" /><span>Painel do site</span>
      </div>
      <div class="header-actions">
        <span class="live-pill"><i /> Coleta operando</span>
        <button class="icon-button theme-button" :aria-label="theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'" @click="toggleTheme">
          <AppIcon :name="theme === 'light' ? 'moon' : 'sun'" />
        </button>
        <button class="profile-button"><span>LA</span><strong>Lucas Andrade</strong></button>
      </div>
    </header>
    <slot />
  </div>
</template>
