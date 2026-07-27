<script setup lang="ts">
import type { Site } from "~/types";

useHead({ title: "Sites" });
const { request } = useApi();
const { data: sites, refresh, status, error } = await useAsyncData("sites", () => request<Site[]>("/sites"), { default: () => [] });
const modal = ref(false);
const saving = ref(false);
const search = ref("");
const form = reactive({ name: "", domains: [""], icon: null as string | null });
const filteredSites = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return sites.value;
  return sites.value.filter((site) => `${site.name} ${site.domains.join(" ")}`.toLowerCase().includes(query));
});
const totalAccesses = computed(() => sites.value.reduce((sum, site) => sum + (site.todayAccesses || 0), 0));
const totalCampaigns = computed(() => sites.value.reduce((sum, site) => sum + (site.activeCampaigns || 0), 0));

function addDomain() {
  form.domains.push("");
}

function removeDomain(index: number) {
  if (form.domains.length > 1) form.domains.splice(index, 1);
}

function chooseIcon(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => (form.icon = String(reader.result));
  reader.readAsDataURL(file);
}

async function saveSite() {
  saving.value = true;
  try {
    await request("/sites", {
      method: "POST",
      body: { name: form.name, domains: form.domains.filter(Boolean), icon: form.icon }
    });
    modal.value = false;
    Object.assign(form, { name: "", domains: [""], icon: null });
    await refresh();
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="home-main page">
    <section class="hero-row">
      <div>
        <span class="eyebrow">Portfólio monitorado</span>
        <h1>Sites</h1>
        <p>Acompanhe tráfego, campanhas e qualidade dos acessos em uma visão centralizada.</p>
      </div>
      <button class="button primary" @click="modal = true"><AppIcon name="plus" :size="18" /> Adicionar site</button>
    </section>

    <section class="summary-strip">
      <div><span>Sites ativos</span><strong>{{ sites.length }}</strong></div>
      <div><span>Acessos hoje</span><strong>{{ formatNumber(totalAccesses) }}</strong></div>
      <div><span>Campanhas ativas</span><strong>{{ totalCampaigns }}</strong></div>
      <div class="summary-health"><span>Integridade da coleta</span><strong><i />99,98%</strong></div>
    </section>

    <section class="card table-card">
      <div class="card-heading">
        <div><h2>Sites cadastrados</h2><p>Dados contabilizados em tempo real desde 00:00.</p></div>
        <label class="search-field"><AppIcon name="filter" :size="18" /><input v-model="search" placeholder="Buscar por nome ou domínio" /></label>
      </div>
      <div v-if="status === 'pending'" class="empty-state">Carregando propriedades…</div>
      <div v-else-if="error" class="empty-state danger">API indisponível. Inicie o serviço Node para carregar os sites.</div>
      <div v-else-if="!sites.length" class="empty-state">
        <span class="empty-icon">◇</span><h2>Cadastre seu primeiro site</h2><p>Você receberá o script de integração logo depois.</p>
      </div>
      <div v-else class="responsive-table">
        <table>
          <thead><tr><th>Site</th><th>Domínios</th><th>Acessos hoje</th><th>Campanhas ativas</th><th aria-label="Ações" /></tr></thead>
          <tbody>
            <tr v-for="site in filteredSites" :key="site._id">
              <td>
                <div class="site-cell"><SiteAvatar :site="site" /><div><strong>{{ site.name }}</strong><small>Coleta ativa</small></div></div>
              </td>
              <td><div class="domain-list"><span v-for="domain in site.domains.slice(0, 2)" :key="domain">{{ domain }}</span></div></td>
              <td><strong class="number">{{ formatNumber(site.todayAccesses) }}</strong><small class="muted">desde 00:00</small></td>
              <td><span class="status-badge active"><i />{{ site.activeCampaigns || 0 }} campanhas</span></td>
              <td><NuxtLink class="button subtle" :to="`/sites/${site._id}`">Acessar <AppIcon name="arrow" :size="17" /></NuxtLink></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ModalShell title="Adicionar novo site" :open="modal" @close="modal = false">
      <form class="stack-form" @submit.prevent="saveSite">
        <label>Nome do site<input v-model="form.name" required minlength="2" placeholder="Ex.: Akros Institucional" /></label>
        <fieldset>
          <legend>Domínios autorizados</legend>
          <div v-for="(_, index) in form.domains" :key="index" class="tag-input">
            <span>https://</span><input v-model="form.domains[index]" required placeholder="exemplo.com.br" />
            <button type="button" aria-label="Remover domínio" @click="removeDomain(index)">×</button>
          </div>
          <button class="text-button" type="button" @click="addDomain">＋ Adicionar outro domínio</button>
        </fieldset>
        <label>Ícone <small>opcional, PNG/JPG/SVG até 1 MB</small><input type="file" accept="image/*" @change="chooseIcon" /></label>
        <div class="form-actions"><button class="button ghost" type="button" @click="modal = false">Cancelar</button><button class="button primary" :disabled="saving">{{ saving ? "Salvando…" : "Criar site" }}</button></div>
      </form>
    </ModalShell>
  </main>
</template>
