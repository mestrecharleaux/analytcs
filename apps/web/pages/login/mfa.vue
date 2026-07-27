<script setup lang="ts">
definePageMeta({ layout: false });
useHead({ title: "Verificação em duas etapas" });
const route = useRoute();
const { request } = useApi();
const { user } = useAuth();
const code = ref("");
const loading = ref(false);
const error = ref("");

async function confirm() {
  loading.value = true;
  error.value = "";
  try {
    const result = await request<{ user: any }>("/auth/login/mfa", {
      method: "POST",
      body: { code: code.value }
    });
    user.value = result.user;
    await useAuth().load();
    await navigateTo(typeof route.query.redirect === "string" ? route.query.redirect : "/");
  } catch (cause: any) {
    error.value = cause?.data?.error || "Não foi possível validar o código.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="auth-brand"><span class="brand-mark"><i /><i /><i /></span><div><strong>Akros Pulse</strong><small>Traffic intelligence</small></div></div>
      <div><span class="eyebrow">Verificação em duas etapas</span><h1>Código do autenticador</h1><p>Digite o código de seis dígitos gerado pelo seu aplicativo de autenticação.</p></div>
      <form class="stack-form" @submit.prevent="confirm">
        <label>Código TOTP<input v-model="code" required autofocus inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" /></label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <div class="form-actions">
          <NuxtLink class="button ghost" to="/login">Voltar</NuxtLink>
          <button class="button primary" :disabled="loading">{{ loading ? "Validando…" : "Confirmar" }}</button>
        </div>
      </form>
    </section>
  </main>
</template>
