<script setup lang="ts">
definePageMeta({ layout: false });
useHead({ title: "Entrar" });
const route = useRoute();
const { request } = useApi();
const { user } = useAuth();
const form = reactive({ email: "", password: "", code: "" });
const mfaRequired = ref(false);
const loading = ref(false);
const error = ref("");

async function login() {
  loading.value = true;
  error.value = "";
  try {
    const result = await request<{ user: any }>("/auth/login", {
      method: "POST",
      body: { email: form.email, password: form.password, ...(mfaRequired.value ? { code: form.code } : {}) }
    });
    user.value = result.user;
    await useAuth().load();
    await navigateTo(typeof route.query.redirect === "string" ? route.query.redirect : "/");
  } catch (cause: any) {
    if (cause?.response?.status === 428) mfaRequired.value = true;
    error.value = cause?.data?.error || "Não foi possível autenticar.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="auth-brand"><span class="brand-mark"><i /><i /><i /></span><div><strong>Akros Pulse</strong><small>Traffic intelligence</small></div></div>
      <div><span class="eyebrow">Acesso seguro</span><h1>Entrar</h1><p>Use suas credenciais para acessar o painel.</p></div>
      <form class="stack-form" @submit.prevent="login">
        <label>Email<input v-model="form.email" required type="email" autocomplete="username" /></label>
        <label>Senha<input v-model="form.password" required type="password" autocomplete="current-password" /></label>
        <label v-if="mfaRequired">Código do autenticador<input v-model="form.code" required inputmode="numeric" maxlength="6" pattern="[0-9]{6}" /></label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="button primary" :disabled="loading">{{ loading ? "Entrando…" : "Entrar" }}</button>
      </form>
    </section>
  </main>
</template>
