<script setup lang="ts">
import type { Recording } from "~/types";

useHead({ title: "Gravações" });
const route = useRoute();
const config = useRuntimeConfig();
const { request } = useApi();
const dates = reactive(dateDefaults());
const filters = reactive({ status: "all", device: "all", browser: "all" });
const liveRecordings = ref<Recording[]>([]);
let liveSource: EventSource | undefined;
let liveReconnecting = false;
let liveDisposed = false;

const { data: recordings, refresh, status, error } = await useAsyncData(
  `recordings-${route.params.id}`,
  () => request<Recording[]>(`/sites/${route.params.id}/recordings`, { query: { ...dates, ...filters } }),
  { default: () => [] }
);

const completed = computed(() => recordings.value.filter((recording) => !recording.live));
const totalEvents = computed(() => recordings.value.reduce((sum, recording) => sum + recording.eventCount, 0));

function applyDates(start: string, end: string) {
  Object.assign(dates, { start, end });
  refresh();
}

function applyFilters() {
  refresh();
}

function formatDuration(value: number) {
  const seconds = Math.floor(value / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function connectLiveSource() {
  liveSource?.close();
  liveSource = new EventSource(
    `${config.public.apiBase}/sites/${route.params.id}/recordings/live`,
    { withCredentials: true }
  );
  liveSource.addEventListener("live", (event) => {
    liveRecordings.value = JSON.parse((event as MessageEvent).data);
  });
  liveSource.onerror = async () => {
    if (liveReconnecting || liveDisposed) return;
    liveReconnecting = true;
    liveSource?.close();
    try {
      await request("/auth/me");
      if (!liveDisposed) window.setTimeout(connectLiveSource, 1_000);
    } finally {
      liveReconnecting = false;
    }
  };
}

onMounted(() => {
  connectLiveSource();
});
onBeforeUnmount(() => {
  liveDisposed = true;
  liveSource?.close();
});
</script>

<template>
  <SiteFrame v-slot="{ site }">
    <header class="page-heading">
      <div><span class="eyebrow">Comportamento real</span><h1>Gravações</h1><p>Reconstruções de navegação, cliques, movimentos e rolagem em {{ site.name }}.</p></div>
      <DateFilter :start="dates.start" :end="dates.end" @apply="applyDates" />
    </header>

    <section class="panel live-sessions-panel">
      <header><div><span class="eyebrow live-label"><i /> Tempo real</span><h2>{{ liveRecordings.length }} {{ liveRecordings.length === 1 ? "visitante navegando" : "visitantes navegando" }}</h2></div><span class="soft-badge">Atualização automática</span></header>
      <div v-if="liveRecordings.length" class="live-session-grid">
        <NuxtLink v-for="recording in liveRecordings" :key="recording.sessionId" class="live-session-card" :to="`/sites/${route.params.id}/recordings/${recording.sessionId}`">
          <span class="live-session-icon"><i /></span>
          <div><strong>{{ recording.visitor }}</strong><small>{{ recording.location?.city || "Local desconhecido" }} · {{ recording.deviceType }}</small></div>
          <div><code>{{ recording.entryPage || "/" }}</code><small>{{ formatDuration(recording.durationMs) }} · {{ recording.pages }} páginas</small></div>
          <span class="button subtle">Assistir →</span>
        </NuxtLink>
      </div>
      <div v-else class="live-empty"><span>◉</span><div><strong>Nenhum visitante ao vivo agora</strong><small>Esta área será atualizada assim que uma nova sessão começar.</small></div></div>
    </section>

    <section class="metric-grid recording-metrics">
      <MetricCard label="Sessões gravadas" :value="formatNumber(recordings.length)" detail="no período selecionado" />
      <MetricCard label="Eventos reconstruídos" :value="formatNumber(totalEvents)" detail="DOM e interações" tone="#0ea5e9" />
      <MetricCard label="Com frustração" :value="formatNumber(recordings.filter(r => r.rageClicks).length)" detail="cliques repetidos" tone="#f97316" />
      <MetricCard label="Não assistidas" :value="formatNumber(recordings.filter(r => !r.watched).length)" detail="aguardando análise" tone="#d946ef" />
    </section>

    <section class="table-card">
      <div class="recordings-toolbar-nuxt">
        <div><strong>Últimas gravações</strong><span>{{ completed.length }} sessões concluídas</span></div>
        <div class="recording-filter-row">
          <select v-model="filters.status" @change="applyFilters"><option value="all">Todas</option><option value="unwatched">Não assistidas</option><option value="rage">Com frustração</option></select>
          <select v-model="filters.device" @change="applyFilters"><option value="all">Todos os dispositivos</option><option>Computador</option><option>Celular</option><option>Tablet</option></select>
        </div>
      </div>
      <div v-if="status === 'pending'" class="empty-state">Carregando gravações…</div>
      <div v-else-if="error" class="empty-state danger">{{ error.message }}</div>
      <div v-else-if="!completed.length" class="empty-state"><span class="empty-icon">◉</span><h2>Nenhuma gravação no período</h2><p>As sessões aparecerão após a instalação do script atualizado.</p></div>
      <div v-else class="responsive-table">
        <table class="recording-table">
          <thead><tr><th>Visitante</th><th>Início</th><th>Jornada</th><th>Entrada</th><th>Sinais</th><th /></tr></thead>
          <tbody>
            <tr v-for="recording in completed" :key="recording.sessionId" :class="{ watched: recording.watched }">
              <td><div class="recording-person"><span>{{ recording.deviceType === "Celular" ? "▯" : "▭" }}</span><div><strong>{{ recording.visitor }}</strong><small>{{ recording.location?.city || "Local desconhecido" }} · {{ recording.browser?.name || "Navegador" }}</small></div></div></td>
              <td><strong>{{ new Date(recording.startedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) }}</strong><small class="muted">{{ formatDuration(recording.durationMs) }}</small></td>
              <td><strong>{{ recording.pages }} páginas</strong><small class="muted">{{ recording.eventCount }} eventos</small></td>
              <td><code>{{ recording.entryPage || "/" }}</code></td>
              <td><span v-if="recording.rageClicks" class="status-badge paused"><i />{{ recording.rageClicks }} cliques de raiva</span><span v-else class="muted">Sem frustração</span></td>
              <td><NuxtLink class="button subtle" :to="`/sites/${route.params.id}/recordings/${recording.sessionId}`">Reproduzir ▶</NuxtLink></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </SiteFrame>
</template>
