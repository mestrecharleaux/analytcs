<script setup lang="ts">
import type { Dashboard } from "~/types";

useHead({ title: "Visão geral" });
const route = useRoute();
const { request } = useApi();
const { dates, applyDateRange } = useSiteDateRange(String(route.params.id));
const selectedKey = ref<string | null>(null);
const queryValues = ref<Array<{ value: string; count: number }>>([]);
const valuesLoading = ref(false);

const { data: dashboard, refresh, status, error } = await useAsyncData(
  `dashboard-${route.params.id}`,
  () => request<Dashboard>(`/sites/${route.params.id}/dashboard`, { query: dates }),
  { watch: [] }
);

function applyDates(start: string, end: string) {
  if (applyDateRange(start, end)) refresh();
}

async function openKey(key: string) {
  selectedKey.value = key;
  valuesLoading.value = true;
  try {
    queryValues.value = await request<Array<{ value: string; count: number }>>(`/sites/${route.params.id}/query-keys/${encodeURIComponent(key)}/values`, { query: dates });
  } finally {
    valuesLoading.value = false;
  }
}
</script>

<template>
  <SiteFrame v-slot="{ site }">
    <header class="page-heading">
      <div><span class="eyebrow">Visão geral</span><h1>{{ site.name }}</h1><p>Leitura consolidada de tráfego, audiência e comportamento.</p></div>
      <DateFilter :start="dates.start" :end="dates.end" @apply="applyDates" />
    </header>

    <div v-if="status === 'pending' && !dashboard" class="empty-state">Calculando indicadores…</div>
    <div v-else-if="error" class="empty-state danger">{{ error.message }}</div>
    <template v-else-if="dashboard">
      <section class="metric-grid">
        <MetricCard label="Acessos reais" :value="formatNumber(dashboard.kpis.realViews)" detail="robôs excluídos" />
        <MetricCard label="Sessões únicas" :value="formatNumber(dashboard.kpis.uniqueSessions)" detail="visitantes no período" tone="#0ea5e9" />
        <MetricCard label="Páginas / sessão" :value="dashboard.kpis.pagesPerSession" detail="profundidade média" tone="#d946ef" />
        <MetricCard label="Acessos de robôs" :value="formatNumber(dashboard.kpis.robotViews)" detail="identificados na coleta" tone="#f97316" />
      </section>

      <section class="dashboard-grid">
        <article class="panel span-8">
          <header><div><span class="eyebrow">Tendência</span><h2>Acessos reais por dia</h2></div><span class="legend"><i /> Acessos</span></header>
          <TrendChart :points="dashboard.daily" />
        </article>
        <article class="panel span-4">
          <header><div><span class="eyebrow">Dispositivos</span><h2>Como acessam</h2></div></header>
          <div class="rank-list">
            <div v-for="device in dashboard.devices" :key="device.name">
              <div><strong>{{ device.name }}</strong><span>{{ formatNumber(device.count) }}</span></div>
              <progress :value="device.count" :max="dashboard.kpis.uniqueSessions || 1" />
            </div>
          </div>
        </article>

        <article class="panel span-8">
          <header><div><span class="eyebrow">Geolocalização aproximada</span><h2>Regiões dos acessos</h2></div><span class="soft-badge">OpenStreetMap</span></header>
          <AccessMap :locations="dashboard.locations" />
        </article>
        <article class="panel span-4">
          <header><div><span class="eyebrow">Tecnologia</span><h2>Navegadores e sistemas</h2></div></header>
          <div class="split-ranking">
            <div><h3>Navegadores</h3><p v-for="item in dashboard.browsers.slice(0, 5)" :key="item.name"><span>{{ item.name }}</span><strong>{{ item.count }}</strong></p></div>
            <div><h3>Sistemas</h3><p v-for="item in dashboard.operatingSystems.slice(0, 5)" :key="item.name"><span>{{ item.name }}</span><strong>{{ item.count }}</strong></p></div>
          </div>
        </article>

        <article class="panel span-6">
          <header><div><span class="eyebrow">HTTP query</span><h2>Parâmetros de entrada</h2></div><small>Clique para detalhar valores</small></header>
          <div class="query-list">
            <button v-for="item in dashboard.queryKeys" :key="item.key" @click="openKey(item.key)">
              <code>{{ item.key }}</code><span>{{ formatNumber(item.count) }} usos</span><b>→</b>
            </button>
          </div>
        </article>
        <article class="panel span-6">
          <header><div><span class="eyebrow">Jornada</span><h2>Principais fluxos de páginas</h2></div></header>
          <div class="flow-list">
            <div v-for="flow in dashboard.flows" :key="`${flow.from}-${flow.to}`"><code>{{ flow.from }}</code><span>→</span><code>{{ flow.to }}</code><strong>{{ flow.count }}</strong></div>
          </div>
        </article>

        <article class="panel span-12">
          <header><div><span class="eyebrow">Conteúdo</span><h2>Páginas acessadas</h2></div><span class="soft-badge">{{ dashboard.pages.length }} páginas</span></header>
          <div class="responsive-table compact">
            <table>
              <thead><tr><th>Página</th><th>Acessos reais</th><th>Acessos totais</th><th>Tráfego válido</th></tr></thead>
              <tbody><tr v-for="page in dashboard.pages" :key="page.path"><td><code>{{ page.path }}</code></td><td><strong>{{ formatNumber(page.real) }}</strong></td><td>{{ formatNumber(page.total) }}</td><td><progress :value="page.real" :max="page.total || 1" /> <small>{{ page.total ? Math.round(page.real / page.total * 100) : 0 }}%</small></td></tr></tbody>
            </table>
          </div>
        </article>
      </section>
    </template>

    <ModalShell :title="`Valores de ${selectedKey}`" :open="Boolean(selectedKey)" @close="selectedKey = null">
      <div v-if="valuesLoading" class="empty-state">Agrupando valores…</div>
      <div v-else class="value-list">
        <div v-for="item in queryValues" :key="item.value"><code>{{ item.value || "(vazio)" }}</code><strong>{{ formatNumber(item.count) }}</strong></div>
      </div>
    </ModalShell>
  </SiteFrame>
</template>
