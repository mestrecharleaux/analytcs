<script setup lang="ts">
useHead({ title: "Criar grupo" });
const { request } = useApi();
const permissionOptions = await request<Array<{ value: string; label: string }>>("/admin/permissions");
const form = reactive({ name: "", permissions: [] as string[] });
async function save() { const group = await request<any>("/admin/groups", { method: "POST", body: form }); await navigateTo(`/admin/groups/${group._id}`); }
</script>
<template><AdminFrame><section class="admin-page page"><NuxtLink class="back-link" to="/admin/groups">← Grupos</NuxtLink><header class="page-heading"><div><span class="eyebrow">Novo grupo</span><h1>Criar grupo</h1></div></header>
<form class="card stack-form admin-form" @submit.prevent="save"><label>Nome<input v-model="form.name" required minlength="2" /></label><fieldset><legend>Permissões</legend><SearchToggleList v-model="form.permissions" :options="permissionOptions" exclusive-all-value="*" placeholder="Buscar permissões" /></fieldset><div class="form-actions"><NuxtLink class="button ghost" to="/admin/groups">Cancelar</NuxtLink><button class="button primary">Criar grupo</button></div></form>
</section></AdminFrame></template>
