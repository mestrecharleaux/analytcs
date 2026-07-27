<script setup lang="ts">
const route = useRoute();
const sidebarCollapsed = useState("site-sidebar-collapsed", () => true);
const adminSidebarCollapsed = useState("admin-sidebar-collapsed", () => true);
const theme = useState<"light" | "dark">("akros-theme", () => "light");
const { user, logout, can } = useAuth();
const profileMenu = ref(false);
const isSiteArea = computed(() => route.path.startsWith("/sites/"));
const isAdminArea = computed(() => route.path.startsWith("/admin"));

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
  <div class="app-shell" :class="{ 'site-area': isSiteArea, 'sidebar-is-collapsed': sidebarCollapsed, 'admin-area': isAdminArea, 'admin-sidebar-is-collapsed': adminSidebarCollapsed }">
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
        <div class="profile-menu-wrap">
          <button class="profile-button" :aria-expanded="profileMenu" @click="profileMenu = !profileMenu">
            <span><img v-if="user?.avatar" :src="user.avatar" alt="" />{{ user?.avatar ? "" : initials(user?.name) }}</span>
            <strong>{{ user?.name }}</strong>
          </button>
          <div v-if="profileMenu" class="profile-menu">
            <NuxtLink to="/profile" @click="profileMenu = false">Meu perfil</NuxtLink>
            <NuxtLink v-if="can('administration:access')" to="/admin/users" @click="profileMenu = false">Administração</NuxtLink>
            <hr />
            <button class="profile-logout" title="Sair" aria-label="Sair" @click="logout"><AppIcon name="logout" /></button>
          </div>
        </div>
      </div>
    </header>
    <slot />
  </div>
</template>
