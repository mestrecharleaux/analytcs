<script setup lang="ts">
const route = useRoute();
const collapsed = useState("admin-sidebar-collapsed", () => true);
const { user } = useAuth();
const links = [
  { label: "Usuários", icon: "users", to: "/admin/users" },
  { label: "Grupos", icon: "shield", to: "/admin/groups" }
];
</script>

<template>
  <div class="site-frame admin-frame" :class="{ 'is-collapsed': collapsed }">
    <aside class="site-sidebar admin-sidebar" :class="{ 'is-collapsed': collapsed }">
      <button
        class="sidebar-collapse-button"
        type="button"
        :aria-label="collapsed ? 'Fixar menu aberto' : 'Usar menu retrátil'"
        :title="collapsed ? 'Fixar menu aberto' : 'Usar menu retrátil'"
        @click="collapsed = !collapsed"
      ><AppIcon name="arrow" :size="17" /></button>
      <NuxtLink class="sidebar-brand" to="/"><span class="brand-mark"><i /><i /><i /></span><span class="brand-copy"><strong>Administração</strong><small>Akros Pulse</small></span></NuxtLink>
      <span class="nav-label">Gerenciamento</span>
      <nav><NuxtLink v-for="link in links" :key="link.to" :to="link.to" :class="{ active: route.path.startsWith(link.to) }"><AppIcon :name="link.icon" /><b>{{ link.label }}</b></NuxtLink></nav>
      <div class="sidebar-foot">
        <NuxtLink to="/"><AppIcon name="sites" /><b>Voltar ao painel</b></NuxtLink>
        <div class="sidebar-user"><span><img v-if="user?.avatar" :src="user.avatar" alt="" />{{ user?.avatar ? "" : initials(user?.name) }}</span><div><strong>{{ user?.name }}</strong><small>Administração</small></div></div>
      </div>
    </aside>
    <main class="site-main admin-main"><div class="site-page"><slot /></div></main>
  </div>
</template>
