<script setup lang="ts">
useHead({ title: "Meu perfil" });
const { user, load } = useAuth();
const { request } = useApi();
const form = reactive({ name: user.value?.name || "", avatar: user.value?.avatar || null as string | null });
const avatarInput = ref<HTMLInputElement>();
const uploadingAvatar = ref(false);
const passwordModal = ref(false);
const password = reactive({ value: "", repeat: "" });
const mfaModal = ref(false);
const mfa = reactive({ name: "Meu autenticador", code: "", secret: "", qrCode: "" });
const message = ref("");
const error = ref("");

function chooseAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    uploadingAvatar.value = true;
    error.value = "";
    try {
      form.avatar = String(reader.result);
      await request("/auth/profile", { method: "PATCH", body: { avatar: form.avatar } });
      await load();
      message.value = "Foto de perfil atualizada.";
    } catch (cause: any) {
      error.value = cause?.data?.error || "Não foi possível atualizar a foto.";
      form.avatar = user.value?.avatar || null;
    } finally {
      uploadingAvatar.value = false;
      if (avatarInput.value) avatarInput.value.value = "";
    }
  };
  reader.readAsDataURL(file);
}

async function saveProfile() {
  error.value = "";
  await request("/auth/profile", { method: "PATCH", body: form });
  await load();
  message.value = "Perfil atualizado.";
}

async function changePassword() {
  error.value = "";
  if (password.value !== password.repeat) {
    error.value = "As senhas não coincidem.";
    return;
  }
  await request("/auth/profile/password", { method: "POST", body: { password: password.value } });
  passwordModal.value = false;
  Object.assign(password, { value: "", repeat: "" });
  message.value = "Senha alterada.";
}

async function startMfa() {
  const setup = await request<{ secret: string; qrCode: string }>("/auth/profile/mfa/setup", {
    method: "POST",
    body: { name: mfa.name }
  });
  mfa.secret = setup.secret;
  mfa.qrCode = setup.qrCode;
}

async function confirmMfa() {
  await request("/auth/profile/mfa/confirm", { method: "POST", body: { code: mfa.code } });
  mfaModal.value = false;
  Object.assign(mfa, { name: "Meu autenticador", code: "", secret: "", qrCode: "" });
  await load();
  message.value = "Dispositivo MFA adicionado.";
}

async function removeMfa(id: string) {
  await request(`/auth/profile/mfa/${id}`, { method: "DELETE" });
  await load();
}
</script>

<template>
  <main class="page profile-page">
    <section class="hero-row"><div><span class="eyebrow">Conta</span><h1>Meu perfil</h1><p>Gerencie seus dados pessoais, senha e autenticação multifator.</p></div></section>
    <p v-if="message" class="success-callout">{{ message }}</p>
    <p v-if="error" class="form-error">{{ error }}</p>
    <div class="profile-grid">
      <section class="card profile-card">
        <button class="profile-avatar-large" type="button" aria-label="Alterar foto de perfil" :disabled="uploadingAvatar" @click="avatarInput?.click()">
          <img v-if="form.avatar" :src="form.avatar" alt="" /><span v-else>{{ initials(form.name) }}</span>
          <span class="avatar-edit-overlay"><AppIcon name="pencil" />{{ uploadingAvatar ? "Enviando…" : "" }}</span>
        </button>
        <input ref="avatarInput" class="sr-only" type="file" accept="image/*" @change="chooseAvatar" />
        <form class="stack-form" @submit.prevent="saveProfile">
          <label>Nome<input v-model="form.name" required minlength="2" /></label>
          <label>Email<input :value="user?.email" disabled type="email" /></label>
          <div class="form-actions"><button type="button" class="button subtle" @click="passwordModal = true">Alterar senha</button><button class="button primary">Salvar perfil</button></div>
        </form>
      </section>
      <section class="card mfa-card">
        <header><div><span class="eyebrow">Segurança</span><h2>Autenticação multifator</h2></div><button class="button primary" @click="mfaModal = true">Adicionar dispositivo</button></header>
        <div v-if="!user?.mfaDevices.length" class="empty-state">Nenhum autenticador configurado.</div>
        <div v-for="device in user?.mfaDevices" :key="device.id" class="mfa-device">
          <AppIcon name="shield" /><div><strong>{{ device.name }}</strong><small>Adicionado em {{ new Date(device.createdAt).toLocaleDateString("pt-BR") }}</small></div>
          <button class="button subtle" @click="removeMfa(device.id)">Remover</button>
        </div>
      </section>
    </div>

    <ModalShell title="Alterar senha" :open="passwordModal" @close="passwordModal = false">
      <form class="stack-form" @submit.prevent="changePassword">
        <label>Senha<input v-model="password.value" required minlength="8" type="password" /></label>
        <label>Repetir senha<input v-model="password.repeat" required minlength="8" type="password" /></label>
        <div class="form-actions"><button type="button" class="button ghost" @click="passwordModal = false">Cancelar</button><button class="button primary">Alterar senha</button></div>
      </form>
    </ModalShell>

    <ModalShell title="Adicionar autenticador" :open="mfaModal" @close="mfaModal = false">
      <form v-if="!mfa.secret" class="stack-form" @submit.prevent="startMfa">
        <label>Nome do dispositivo<input v-model="mfa.name" required minlength="2" /></label>
        <div class="form-actions"><button class="button primary">Gerar chave</button></div>
      </form>
      <form v-else class="stack-form mfa-setup" @submit.prevent="confirmMfa">
        <img :src="mfa.qrCode" alt="QR Code do autenticador" />
        <label>Chave para copiar<input :value="mfa.secret" readonly @focus="($event.target as HTMLInputElement).select()" /></label>
        <label>Código gerado pelo aplicativo<input v-model="mfa.code" required maxlength="6" pattern="[0-9]{6}" inputmode="numeric" /></label>
        <div class="form-actions"><button class="button primary">Finalizar registro</button></div>
      </form>
    </ModalShell>
  </main>
</template>
