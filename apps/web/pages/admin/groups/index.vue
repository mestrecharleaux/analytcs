<script setup lang="ts">
import type { AdminGroup } from "~/types";
useHead({ title: "Grupos" });
const { request } = useApi();
const { data: groups } = await useAsyncData("admin-groups", () => request<AdminGroup[]>("/admin/groups"), { default: () => [] });
</script>
<template><AdminFrame><section class="admin-page page"><header class="hero-row"><div><span class="eyebrow">Administração</span><h1>Grupos</h1><p>Permissões e vínculos dos usuários.</p></div><NuxtLink class="button primary" to="/admin/groups/new"><AppIcon name="plus" />Criar grupo</NuxtLink></header>
<section class="card table-card"><div class="responsive-table"><table><thead><tr><th>Nome</th><th>Usuários</th><th>Permissões</th><th /></tr></thead><tbody><tr v-for="group in groups" :key="group._id"><td><strong>{{ group.name }}</strong><small v-if="group.fixed" class="muted">Fixo</small></td><td>{{ group.userCount || 0 }}</td><td>{{ group.permissions.includes("*") ? "Todas" : group.permissions.length }}</td><td><NuxtLink class="button subtle" :to="`/admin/groups/${group._id}`">Visualizar</NuxtLink></td></tr></tbody></table></div></section>
</section></AdminFrame></template>
