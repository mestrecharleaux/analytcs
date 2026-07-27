<script setup lang="ts">
import type { Site } from "~/types";

useHead({ title: "Configurações" });
const route = useRoute();
const { request } = useApi();
const { data: site, refresh } = await useAsyncData(`settings-${route.params.id}`, () => request<Site>(`/sites/${route.params.id}`));
const saving = ref(false);
const saved = ref(false);
const form = reactive({ name: "", domains: [] as string[], timezone: "America/Sao_Paulo", icon: null as string | null });
watchEffect(() => {
  if (site.value) Object.assign(form, { name: site.value.name, domains: [...site.value.domains], timezone: site.value.timezone, icon: site.value.icon || null });
});
function chooseIcon(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => (form.icon = String(reader.result));
  reader.readAsDataURL(file);
}
async function save() {
  saving.value = true;
  try {
    await request(`/sites/${route.params.id}`, { method: "PATCH", body: form });
    saved.value = true;
    setTimeout(() => (saved.value = false), 2500);
    await refresh();
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <SiteFrame>
    <header class="page-heading"><div><span class="eyebrow">Propriedade</span><h1>Configurações do site</h1><p>Altere o cadastro-base e os domínios que podem enviar dados.</p></div></header>
    <section v-if="site" class="settings-card">
      <form class="stack-form" @submit.prevent="save">
        <div class="settings-avatar"><SiteAvatar :site="{ ...site, icon: form.icon }" size="lg" /><label class="button subtle">Trocar ícone<input class="sr-only" type="file" accept="image/*" @change="chooseIcon" /></label><button v-if="form.icon" class="text-button danger-text" type="button" @click="form.icon = null">Remover</button></div>
        <label>Nome do site<input v-model="form.name" required /></label>
        <fieldset><legend>Domínios autorizados</legend><div v-for="(_, index) in form.domains" :key="index" class="tag-input"><span>https://</span><input v-model="form.domains[index]" required /><button type="button" @click="form.domains.splice(index, 1)">×</button></div><button class="text-button" type="button" @click="form.domains.push('')">＋ Adicionar domínio</button></fieldset>
        <label>Fuso horário<select v-model="form.timezone"><option value="America/Sao_Paulo">São Paulo (BRT)</option><option value="America/Manaus">Manaus (AMT)</option><option value="America/Recife">Recife (BRT)</option><option value="UTC">UTC</option></select><small>Define o início e o fim dos dias nos relatórios.</small></label>
        <div class="form-actions"><span v-if="saved" class="success-text">✓ Alterações salvas</span><button class="button primary" :disabled="saving">{{ saving ? "Salvando…" : "Salvar alterações" }}</button></div>
      </form>
    </section>
  </SiteFrame>
</template>
