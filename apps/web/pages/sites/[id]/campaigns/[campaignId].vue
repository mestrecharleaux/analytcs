<script setup lang="ts">
const route = useRoute();
const { request } = useApi();
const { dates, applyDateRange } = useSiteDateRange(String(route.params.id));
const { data: dashboard, refresh } = await useAsyncData(`campaign-dashboard-${route.params.campaignId}`, () =>
  request<any>(`/sites/${route.params.id}/campaigns/${route.params.campaignId}/dashboard`, { query: dates })
);
useHead({ title: computed(() => dashboard.value?.campaign?.name || "Dashboard da campanha") });
function applyDates(start: string, end: string) {
  if (applyDateRange(start, end)) refresh();
}
</script>

<template>
  <SiteFrame>
    <header class="page-heading">
      <div><NuxtLink class="back-link inline" :to="`/sites/${route.params.id}/campaigns`">← Campanhas</NuxtLink><span class="eyebrow">Dashboard de campanha</span><h1>{{ dashboard?.campaign.name || "Carregando…" }}</h1><p v-if="dashboard">utm_campaign={{ dashboard.campaign.utmCampaign }}</p></div>
      <DateFilter :start="dates.start" :end="dates.end" @apply="applyDates" />
    </header>
    <template v-if="dashboard">
      <section class="metric-grid">
        <MetricCard label="Acessos reais" :value="formatNumber(dashboard.kpis.realViews)" detail="atribuídos à campanha" />
        <MetricCard label="Sessões" :value="formatNumber(dashboard.kpis.sessions)" detail="pessoas alcançadas" tone="#0ea5e9" />
        <MetricCard label="Acessos totais" :value="formatNumber(dashboard.kpis.totalViews)" detail="incluindo robôs" tone="#d946ef" />
        <MetricCard label="Robôs excluídos" :value="formatNumber(dashboard.kpis.robotViews)" detail="qualidade do tráfego" tone="#f97316" />
      </section>
      <section class="dashboard-grid">
        <article class="panel span-8"><header><div><span class="eyebrow">Performance</span><h2>Acessos por dia</h2></div></header><TrendChart :points="dashboard.daily" /></article>
        <article class="panel span-4"><header><div><span class="eyebrow">Campanha</span><h2>Configuração</h2></div></header><dl class="detail-list"><div><dt>Canal</dt><dd>{{ dashboard.campaign.channel }}</dd></div><div><dt>Status</dt><dd>{{ dashboard.campaign.status }}</dd></div><div><dt>Início</dt><dd>{{ new Date(dashboard.campaign.startDate).toLocaleDateString("pt-BR") }}</dd></div><div><dt>Objetivo</dt><dd>{{ dashboard.campaign.goalPath || "Não definido" }}</dd></div></dl></article>
        <article class="panel span-12"><header><div><span class="eyebrow">Conteúdo</span><h2>Páginas visitadas pela campanha</h2></div></header><div class="responsive-table compact"><table><thead><tr><th>Página</th><th>Acessos reais</th><th>Total</th></tr></thead><tbody><tr v-for="page in dashboard.pages" :key="page.path"><td><code>{{ page.path }}</code></td><td><strong>{{ page.real }}</strong></td><td>{{ page.total }}</td></tr></tbody></table></div></article>
      </section>
    </template>
  </SiteFrame>
</template>
