<script setup lang="ts">
import type { Site } from "~/types";

const props = defineProps<{ site: Site }>();
const collapsed = defineModel<boolean>("collapsed", { default: true });
const route = useRoute();
const links = computed(() => [
  { label: "Visão geral", icon: "chart", section: "Análise", to: `/sites/${route.params.id}` },
  { label: "Gravações", icon: "recording", badge: "LIVE", to: `/sites/${route.params.id}/recordings` },
  { label: "Campanhas", icon: "campaign", section: "Gestão", badge: siteActiveCampaigns(), to: `/sites/${route.params.id}/campaigns` },
  { label: "Configurações do site", icon: "settings", to: `/sites/${route.params.id}/settings` },
  { label: "Integração", icon: "code", to: `/sites/${route.params.id}/integration` }
]);

function siteActiveCampaigns() {
  return props.site.activeCampaigns ? String(props.site.activeCampaigns) : undefined;
}

function isActive(to: string) {
  const root = `/sites/${route.params.id}`;
  return to === root
    ? route.path === root
    : route.path === to || route.path.startsWith(`${to}/`);
}
</script>

<template>
  <aside class="site-sidebar" :class="{ 'is-collapsed': collapsed }">
    <button
      class="sidebar-collapse-button"
      type="button"
      :aria-label="collapsed ? 'Expandir menu lateral' : 'Reduzir menu lateral'"
      :title="collapsed ? 'Expandir menu lateral' : 'Reduzir menu lateral'"
      @click="collapsed = !collapsed"
    >
      <AppIcon name="arrow" :size="17" />
    </button>
    <NuxtLink class="sidebar-brand" to="/" aria-label="Akros Pulse">
      <span class="brand-mark"><i /><i /><i /></span>
      <span class="brand-copy"><strong>Akros Pulse</strong><small>Traffic intelligence</small></span>
    </NuxtLink>
    <div class="sidebar-site">
      <SiteAvatar :site="site" size="md" />
      <div class="sidebar-site-copy"><strong>{{ site.name }}</strong><small>{{ site.domains[0] }}</small></div>
    </div>
    <nav>
      <template v-for="link in links" :key="link.to">
        <span v-if="link.section" class="nav-label">{{ link.section }}</span>
        <NuxtLink :to="link.to" :title="link.label" :class="{ active: isActive(link.to) }">
          <AppIcon :name="link.icon" /><b>{{ link.label }}</b><em v-if="link.badge">{{ link.badge }}</em>
        </NuxtLink>
      </template>
    </nav>
    <div class="sidebar-foot">
      <NuxtLink to="/" title="Todos os sites"><AppIcon name="sites" /><b>Todos os sites</b></NuxtLink>
      <div class="sidebar-user"><span>LA</span><div><strong>Lucas Andrade</strong><small>Administrador</small></div></div>
    </div>
  </aside>
</template>
