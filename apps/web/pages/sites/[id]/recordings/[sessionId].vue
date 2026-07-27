<script setup lang="ts">
import type { RecordingDetails } from "~/types";

const route = useRoute();
const config = useRuntimeConfig();
const { request } = useApi();
const player = ref<{
  addEvents: (events: Array<Record<string, any>>) => void;
  goLive: () => void;
} | null>(null);
let stream: EventSource | undefined;

const { data: recording, error } = await useAsyncData(
  `recording-${route.params.sessionId}`,
  () => request<RecordingDetails>(`/sites/${route.params.id}/recordings/${route.params.sessionId}`)
);
const isLive = computed(() => {
  const value = recording.value?.session.recordingLastEventAt;
  return value ? Date.now() - new Date(value).getTime() < 60_000 : false;
});
useHead({ title: computed(() => `Gravação ${String(route.params.sessionId).slice(-6).toUpperCase()}`) });

onMounted(async () => {
  await request(`/sites/${route.params.id}/recordings/${route.params.sessionId}`, { method: "PATCH", body: { watched: true } });
  if (isLive.value && recording.value) {
    stream = new EventSource(
      `${config.public.apiBase}/sites/${route.params.id}/recordings/${route.params.sessionId}/stream?after=${recording.value.lastSequence}`
    );
    stream.addEventListener("events", (event) => {
      const batch = JSON.parse((event as MessageEvent).data);
      player.value?.addEvents(batch.events);
    });
  }
});
onBeforeUnmount(() => stream?.close());

async function toggleFavorite() {
  if (!recording.value) return;
  const favorite = !recording.value.session.recordingFavorite;
  await request(`/sites/${route.params.id}/recordings/${route.params.sessionId}`, { method: "PATCH", body: { favorite } });
  recording.value.session.recordingFavorite = favorite;
}
</script>

<template>
  <SiteFrame>
    <header class="page-heading">
      <div><NuxtLink class="back-link inline" :to="`/sites/${route.params.id}/recordings`">← Gravações</NuxtLink><span class="eyebrow">{{ isLive ? "Sessão ao vivo" : "Reprodução de sessão" }}</span><h1>Visitante {{ String(route.params.sessionId).slice(-6).toUpperCase() }}</h1><p v-if="recording">{{ recording.session.location?.city || "Local desconhecido" }} · {{ recording.session.deviceType }} · {{ recording.session.browser?.name }}</p></div>
      <button v-if="recording" class="button subtle" @click="toggleFavorite">{{ recording.session.recordingFavorite ? "★ Favorita" : "☆ Favoritar" }}</button>
    </header>
    <div v-if="error" class="empty-state danger">{{ error.message }}</div>
    <section v-else-if="recording" class="replay-layout">
      <article class="replay-panel">
        <SessionReplay ref="player" :events="recording.events" :live="isLive" />
      </article>
      <aside class="panel replay-details">
        <header><div><span class="eyebrow">Jornada</span><h2>Eventos da sessão</h2></div><span v-if="isLive" class="status-badge active"><i />Ao vivo</span></header>
        <div class="replay-profile">
          <div><small>Início</small><strong>{{ new Date(recording.session.startedAt).toLocaleString("pt-BR") }}</strong></div>
          <div><small>Duração</small><strong>{{ Math.floor((recording.session.recordingDurationMs || 0) / 60000) }} min</strong></div>
          <div><small>Eventos</small><strong>{{ formatNumber(recording.session.recordingEventCount) }}</strong></div>
          <div><small>Frustrações</small><strong>{{ recording.session.recordingRageClicks || 0 }}</strong></div>
        </div>
        <div class="replay-journey">
          <div v-for="(page, index) in recording.pages" :key="`${page.path}-${page.occurredAt}`"><span>{{ index + 1 }}</span><div><strong>{{ page.path }}</strong><small>{{ new Date(page.occurredAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }}</small></div></div>
        </div>
        <div class="privacy-callout"><span>✓</span><p><strong>Privacidade aplicada na origem</strong><small>Inputs e elementos marcados são mascarados antes do envio.</small></p></div>
      </aside>
    </section>
  </SiteFrame>
</template>
