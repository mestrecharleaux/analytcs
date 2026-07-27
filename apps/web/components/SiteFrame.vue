<script setup lang="ts">
import type { Site } from "~/types";

const route = useRoute();
const { request } = useApi();
const sidebarCollapsed = useState("site-sidebar-collapsed", () => true);
const { data: site, error } = await useAsyncData(`site-frame-${route.params.id}`, () =>
  request<Site>(`/sites/${route.params.id}`)
);
</script>

<template>
  <div v-if="site" class="site-frame" :class="{ 'is-collapsed': sidebarCollapsed }">
    <SiteNav v-model:collapsed="sidebarCollapsed" :site="site" />
    <main class="site-main"><div class="site-page"><slot :site="site" /></div></main>
  </div>
  <main v-else class="state-page">
    <span class="eyebrow">Não foi possível abrir</span>
    <h1>Site indisponível</h1>
    <p>{{ error?.message || "Verifique a API e tente novamente." }}</p>
    <NuxtLink class="button primary" to="/">Voltar aos sites</NuxtLink>
  </main>
</template>
