<script setup lang="ts">
import type { AdminGroup, AdminUser } from "~/types";
const route = useRoute();
const { request } = useApi();
const [user, groups] = await Promise.all([
  request<AdminUser>(`/admin/users/${route.params.userId}`),
  request<AdminGroup[]>("/admin/groups")
]);
useHead({ title: user.name });
const form = reactive({
  name: user.name, email: user.email, active: user.active,
  groups: (user.groups as any[]).map((group) => typeof group === "string" ? group : group._id)
});
const passwordModal = ref(false);
const password = reactive({ value: "", repeat: "" });
const error = ref("");
const groupOptions = computed(() => groups.map((group) => ({
  value: group._id,
  label: group.name,
  detail: group.permissions.includes("*") ? "Acesso total" : `${group.permissions.length} permissões`
})));
const saved = ref(false);
async function save() {
  await request(`/admin/users/${user._id}`, { method: "PATCH", body: form });
  saved.value = true;
}
async function changePassword() {
  error.value = "";
  if (password.value !== password.repeat) {
    error.value = "As senhas não coincidem.";
    return;
  }
  await request(`/admin/users/${user._id}`, { method: "PATCH", body: { password: password.value } });
  Object.assign(password, { value: "", repeat: "" });
  passwordModal.value = false;
  saved.value = true;
}
</script>
<template><AdminFrame><section class="admin-page page"><NuxtLink class="back-link" to="/admin/users">← Usuários</NuxtLink><header class="page-heading"><div><span class="eyebrow">Dados do usuário</span><h1>{{ user.name }}</h1><p v-if="user.fixed">Registro fixo: disponível somente para consulta.</p></div></header>
  <p v-if="saved" class="success-callout">Usuário atualizado.</p>
  <form class="card stack-form admin-form" @submit.prevent="save"><label>Nome<input v-model="form.name" :disabled="user.fixed" required /></label><label>Email<input v-model="form.email" :disabled="user.fixed" required type="email" /></label>
  <fieldset><legend>Grupos</legend><SearchToggleList v-model="form.groups" :options="groupOptions" :disabled="user.fixed" placeholder="Buscar grupos" /></fieldset>
  <label class="check-row"><input v-model="form.active" :disabled="user.fixed" type="checkbox" />Usuário ativo</label><div v-if="!user.fixed" class="form-actions"><button type="button" class="button subtle" @click="passwordModal = true">Alterar senha</button><button class="button primary">Salvar alterações</button></div></form>
  <ModalShell title="Alterar senha do usuário" :open="passwordModal" @close="passwordModal = false"><form class="stack-form" @submit.prevent="changePassword"><label>Nova senha<input v-model="password.value" required minlength="8" type="password" /></label><label>Repetir senha<input v-model="password.repeat" required minlength="8" type="password" /></label><p v-if="error" class="form-error">{{ error }}</p><div class="form-actions"><button type="button" class="button ghost" @click="passwordModal = false">Cancelar</button><button class="button primary">Alterar senha</button></div></form></ModalShell>
</section></AdminFrame></template>
