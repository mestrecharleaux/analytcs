<script setup lang="ts">
import type { AdminGroup } from "~/types";
useHead({ title: "Adicionar usuário" });
const { request } = useApi();
const groups = await request<AdminGroup[]>("/admin/groups");
const form = reactive({ name: "", email: "", password: "", groups: [] as string[], active: true });
const groupOptions = computed(() => groups.map((group) => ({
  value: group._id,
  label: group.name,
  detail: group.permissions.includes("*") ? "Acesso total" : `${group.permissions.length} permissões`
})));
async function save() {
  const user = await request<any>("/admin/users", { method: "POST", body: form });
  await navigateTo(`/admin/users/${user._id}`);
}
</script>
<template><AdminFrame><section class="admin-page page"><NuxtLink class="back-link" to="/admin/users">← Usuários</NuxtLink><header class="page-heading"><div><span class="eyebrow">Novo cadastro</span><h1>Adicionar usuário</h1></div></header>
  <form class="card stack-form admin-form" @submit.prevent="save"><label>Nome<input v-model="form.name" required minlength="2" /></label><label>Email<input v-model="form.email" required type="email" /></label><label>Senha inicial<input v-model="form.password" required minlength="8" type="password" /></label>
  <fieldset><legend>Grupos</legend><SearchToggleList v-model="form.groups" :options="groupOptions" placeholder="Buscar grupos" /></fieldset>
  <label class="check-row"><input v-model="form.active" type="checkbox" />Usuário ativo</label><div class="form-actions"><NuxtLink class="button ghost" to="/admin/users">Cancelar</NuxtLink><button class="button primary">Cadastrar</button></div></form>
</section></AdminFrame></template>
