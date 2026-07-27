<script setup lang="ts">
const route = useRoute(); const { request } = useApi(); const search = ref(""); const page = ref(1);
const { data, refresh } = await useAsyncData(`group-${route.params.groupId}`, () => request<any>(`/admin/groups/${route.params.groupId}`, { query: { search: search.value, page: page.value } }));
watch([search, page], () => refresh());
useHead({ title: computed(() => data.value?.group.name || "Grupo") });
</script>
<template><AdminFrame><section v-if="data" class="admin-page page"><NuxtLink class="back-link" to="/admin/groups">← Grupos</NuxtLink><header class="hero-row"><div><span class="eyebrow">Grupo</span><h1>{{ data.group.name }}</h1><p v-if="data.group.fixed">Grupo fixo: disponível somente para consulta.</p></div><NuxtLink v-if="!data.group.fixed" class="button primary" :to="`/admin/groups/${data.group._id}/edit`">Alterar grupo</NuxtLink></header>
<section class="card permission-summary"><h2>Permissões vinculadas</h2><div class="permission-tags"><span v-for="permission in data.group.permissions" :key="permission">{{ permission === "*" ? "Todas (*)" : permission }}</span></div></section>
<section class="card table-card"><div class="card-heading"><div><h2>Usuários vinculados</h2><p>{{ data.total }} usuários</p></div><label class="search-field"><input v-model="search" placeholder="Buscar usuário" /></label></div><div class="responsive-table"><table><thead><tr><th>Nome</th><th>Email</th><th>Status</th></tr></thead><tbody><tr v-for="item in data.users" :key="item._id"><td>{{ item.name }}</td><td>{{ item.email }}</td><td>{{ item.active ? "Ativo" : "Inativo" }}</td></tr></tbody></table></div><div class="pagination"><button :disabled="page <= 1" @click="page--">Anterior</button><span>{{ page }} / {{ data.pages }}</span><button :disabled="page >= data.pages" @click="page++">Próxima</button></div></section>
</section></AdminFrame></template>
