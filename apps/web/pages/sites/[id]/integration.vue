<script setup lang="ts">
const route = useRoute();
const { request } = useApi();
const copied = ref(false);
const { data: integration } = await useAsyncData(`integration-${route.params.id}`, () =>
  request<{ script: string; domains: string[]; trackerUrl: string; collectUrl: string; replayUrl: string }>(`/sites/${route.params.id}/integration`)
);
useHead({ title: "Integração" });
async function copyScript() {
  if (!integration.value) return;
  await navigator.clipboard.writeText(integration.value.script);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2200);
}
</script>

<template>
  <SiteFrame v-slot="{ site }">
    <header class="page-heading"><div><span class="eyebrow">Coleta</span><h1>Integração</h1><p>Instale uma única vez para acompanhar páginas e rotas SPA de {{ site.name }}.</p></div></header>
    <section class="integration-grid">
      <article class="panel integration-code">
        <header><div><span class="step-number">1</span><div><span class="eyebrow">Script de rastreamento</span><h2>Adicione antes de &lt;/head&gt;</h2></div></div><button class="button subtle" @click="copyScript">{{ copied ? "✓ Copiado" : "Copiar script" }}</button></header>
        <pre><code>{{ integration?.script || "Carregando…" }}</code></pre>
        <div class="integration-endpoints">
          <div><span>Biblioteca</span><code>{{ integration?.trackerUrl || "Carregando…" }}</code></div>
          <div><span>Acessos e páginas</span><code>{{ integration?.collectUrl || "Carregando…" }}</code></div>
          <div><span>Gravações rrweb</span><code>{{ integration?.replayUrl || "Carregando…" }}</code></div>
        </div>
        <div class="info-note"><strong>Privacidade e precisão</strong><p>O IP é recebido no servidor, a localização é aproximada e a retenção deve ser configurada de acordo com sua política de privacidade e a LGPD.</p></div>
      </article>
      <aside class="panel checklist">
        <span class="eyebrow">Checklist</span><h2>Depois de instalar</h2>
        <ol><li><i>1</i><div><strong>Publique o script</strong><span>Em todas as páginas do domínio.</span></div></li><li><i>2</i><div><strong>Navegue pelo site</strong><span>O primeiro evento deve aparecer em segundos.</span></div></li><li><i>3</i><div><strong>Valide os domínios</strong><span>{{ integration?.domains.join(", ") }}</span></div></li></ol>
        <span class="status-banner"><i /> Coleta e gravações habilitadas</span>
      </aside>
      <article class="panel span-all">
        <header><div><span class="step-number">2</span><div><span class="eyebrow">Campanhas</span><h2>Use parâmetros UTM nos links</h2></div></div></header>
        <p>O valor de <code>utm_campaign</code> deve ser igual ao identificador configurado na campanha. Outros parâmetros — como <code>utm_source</code>, <code>utm_medium</code> e chaves próprias — também serão agrupados.</p>
        <pre><code>https://{{ site.domains[0] }}/oferta?utm_source=google&utm_medium=cpc&utm_campaign=lancamento-inverno</code></pre>
      </article>
    </section>
  </SiteFrame>
</template>
