<script setup lang="ts">
import type { AdminUser } from "~/types";
useHead({ title: "Usuários" });
const { request } = useApi();
const search = ref("");
const page = ref(1);
const { data, refresh } = await useAsyncData("admin-users", () =>
  request<{ items: AdminUser[]; total: number; page: number; pages: number }>("/admin/users", { query: { search: search.value, page: page.value } })
);
watch([search, page], () => refresh());
</script>

<template><AdminFrame><section class="admin-page page">
  <header class="hero-row"><div><span class="eyebrow">Administração</span><h1>Usuários</h1><p>{{ data?.total || 0 }} usuários cadastrados.</p></div><NuxtLink class="button primary" to="/admin/users/new"><AppIcon name="plus" />Adicionar usuário</NuxtLink></header>
  <section class="card table-card"><div class="card-heading"><h2>Listagem</h2><label class="search-field"><AppIcon name="filter" /><input v-model="search" placeholder="Buscar nome ou email" /></label></div>
    <div class="responsive-table"><table><thead><tr><th>Usuário</th><th>Grupos</th><th>Status</th><th /></tr></thead><tbody>
      <tr v-for="item in data?.items" :key="item._id"><td><strong>{{ item.name }}</strong><small class="muted">{{ item.email }}</small></td><td>{{ item.groups.map((g: any) => g.name).join(", ") || "Sem grupo" }}</td><td><span class="status-badge" :class="{ active: item.active }"><i />{{ item.active ? "Ativo" : "Inativo" }}</span></td><td><NuxtLink class="button subtle" :to="`/admin/users/${item._id}`">Visualizar</NuxtLink></td></tr>
    </tbody></table></div>
    <div class="pagination"><button :disabled="page <= 1" @click="page--">Anterior</button><span>{{ page }} / {{ data?.pages || 1 }}</span><button :disabled="page >= (data?.pages || 1)" @click="page++">Próxima</button></div>
  </section>
</section></AdminFrame></template>
