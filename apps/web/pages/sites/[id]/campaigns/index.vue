<script setup lang="ts">
import type { Campaign } from "~/types";

useHead({ title: "Campanhas" });
const route = useRoute();
const { request } = useApi();
const modal = ref(false);
const saving = ref(false);
const form = reactive({
  name: "",
  channel: "google_ads",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  status: "active",
  utmCampaign: "",
  goalPath: ""
});
const { data: campaigns, refresh } = await useAsyncData(`campaigns-${route.params.id}`, () =>
  request<Campaign[]>(`/sites/${route.params.id}/campaigns`),
  { default: () => [] }
);
const channels: Record<string, string> = {
  google_ads: "Google Ads", facebook: "Facebook", instagram: "Instagram", whatsapp: "WhatsApp",
  email: "E-mail", linkedin: "LinkedIn", organic: "Orgânico", other: "Outro"
};
const statuses: Record<string, string> = { draft: "Rascunho", scheduled: "Agendada", active: "Ativa", paused: "Pausada", ended: "Encerrada" };

async function saveCampaign() {
  saving.value = true;
  try {
    await request(`/sites/${route.params.id}/campaigns`, {
      method: "POST",
      body: { ...form, endDate: form.endDate || null, goalPath: form.goalPath || null }
    });
    modal.value = false;
    await refresh();
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <SiteFrame v-slot="{ site }">
    <header class="page-heading">
      <div><span class="eyebrow">Aquisição</span><h1>Campanhas</h1><p>Organize divulgações e conecte os parâmetros UTM de {{ site.name }}.</p></div>
      <button class="button primary" @click="modal = true">＋ Nova campanha</button>
    </header>
    <section class="table-card campaign-table">
      <div class="table-toolbar"><div><strong>{{ campaigns.length }} campanhas</strong><span>Histórico e vigência</span></div></div>
      <div v-if="!campaigns.length" class="empty-state"><span class="empty-icon">◎</span><h2>Nenhuma campanha criada</h2><p>Comece pela campanha que está rodando agora.</p></div>
      <div v-else class="responsive-table">
        <table>
          <thead><tr><th>Campanha</th><th>Divulgação</th><th>Vigência</th><th>Status</th><th /></tr></thead>
          <tbody>
            <tr v-for="campaign in campaigns" :key="campaign._id">
              <td><strong>{{ campaign.name }}</strong><small class="muted">utm_campaign={{ campaign.utmCampaign }}</small></td>
              <td><span class="channel-badge">{{ channels[campaign.channel] || campaign.channel }}</span></td>
              <td>{{ new Date(campaign.startDate).toLocaleDateString("pt-BR") }} <span class="muted">→</span> {{ campaign.endDate ? new Date(campaign.endDate).toLocaleDateString("pt-BR") : "contínua" }}</td>
              <td><span class="status-badge" :class="campaign.status"><i />{{ statuses[campaign.status] }}</span></td>
              <td><NuxtLink class="button subtle" :to="`/sites/${route.params.id}/campaigns/${campaign._id}`">Dashboard →</NuxtLink></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ModalShell title="Criar campanha" :open="modal" @close="modal = false">
      <form class="stack-form two-col" @submit.prevent="saveCampaign">
        <label class="full">Nome da campanha<input v-model="form.name" required placeholder="Ex.: Lançamento de inverno" /></label>
        <label>Divulgação<select v-model="form.channel"><option v-for="(label, key) in channels" :key="key" :value="key">{{ label }}</option></select></label>
        <label>Status<select v-model="form.status"><option v-for="(label, key) in statuses" :key="key" :value="key">{{ label }}</option></select></label>
        <label>Data inicial<input v-model="form.startDate" required type="date" /></label>
        <label>Data final <small>opcional</small><input v-model="form.endDate" type="date" :min="form.startDate" /></label>
        <label class="full">Identificador UTM<input v-model="form.utmCampaign" required placeholder="lancamento-inverno" /><small>Corresponde ao valor de utm_campaign.</small></label>
        <label class="full">Página de objetivo <small>opcional</small><input v-model="form.goalPath" placeholder="/obrigado" /></label>
        <div class="form-actions full"><button class="button ghost" type="button" @click="modal = false">Cancelar</button><button class="button primary" :disabled="saving">{{ saving ? "Criando…" : "Criar campanha" }}</button></div>
      </form>
    </ModalShell>
  </SiteFrame>
</template>
