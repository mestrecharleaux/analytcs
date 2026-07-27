<script setup lang="ts">
const route = useRoute(); const { request } = useApi();
const [details, permissionOptions] = await Promise.all([request<any>(`/admin/groups/${route.params.groupId}`), request<Array<{ value: string; label: string }>>("/admin/permissions")]);
if (details.group.fixed) await navigateTo(`/admin/groups/${details.group._id}`);
const form = reactive({ name: details.group.name, permissions: [...details.group.permissions] as string[] });
async function save() { await request(`/admin/groups/${details.group._id}`, { method: "PATCH", body: form }); await navigateTo(`/admin/groups/${details.group._id}`); }
</script>
<template><AdminFrame><section class="admin-page page"><NuxtLink class="back-link" :to="`/admin/groups/${details.group._id}`">← Grupo</NuxtLink><header class="page-heading"><div><span class="eyebrow">Permissões</span><h1>Alterar grupo</h1></div></header><form class="card stack-form admin-form" @submit.prevent="save"><label>Nome<input v-model="form.name" required /></label><fieldset><legend>Permissões</legend><SearchToggleList v-model="form.permissions" :options="permissionOptions" exclusive-all-value="*" placeholder="Buscar permissões" /></fieldset><div class="form-actions"><button class="button primary">Salvar alterações</button></div></form></section></AdminFrame></template>
