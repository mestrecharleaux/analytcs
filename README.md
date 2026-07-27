# Akros Pulse

Sistema full stack de análise de tráfego e campanhas, construído a partir da identidade visual do AkrosHub.

## Arquitetura

```text
Navegador rastreado → tracker.js + rrweb → API Node/Express → MongoDB
                                               ↕
                                             Redis

Nuxt dashboard → API analítica → agregações MongoDB + cache Redis
```

- **Front-end:** Nuxt 4, Vue 3 e Leaflet/OpenStreetMap.
- **API:** Node.js, Express, TypeScript, Zod e Mongoose.
- **Dados:** MongoDB para eventos e cadastros; Redis para cache e limitação de coleta.
- **Rastreamento:** script assíncrono com suporte a navegação tradicional, rotas SPA e reconstrução visual de sessões com rrweb.
- **Gravações:** lista de sessões, filtros, jornada de páginas, reprodução, indicadores de frustração e acompanhamento ao vivo via Server-Sent Events.

## Instalar o rastreador

Abra um site no painel e acesse **Integração**. O snippet contém a chave exclusiva daquele site e aponta para a URL pública da própria API:

```html
<script async src="https://analytics-api.seudominio.com/tracker.js?v=3" data-site="ak_..." data-recording="on"></script>
```

O bundle é gerado automaticamente antes de iniciar a API em desenvolvimento e durante a build de produção. A partir da URL do script, ele envia:

- visualizações de páginas e mudanças de rota SPA para `/v1/collect`;
- lotes rrweb com DOM, cliques, movimentos e rolagem para `/v1/replay-events`;
- atualizações que alimentam a listagem e o acompanhamento ao vivo em **Gravações**.

Os endpoints de coleta respondem ao preflight cross-origin usando a chave do site presente na URL. A API carrega os domínios cadastrados para essa chave e autoriza apenas hostnames correspondentes; o protocolo e a porta não interferem, portanto o mesmo cadastro funciona via HTTP ou HTTPS. Cada POST também é validado novamente antes da persistência. Se o site rastreado usa Content Security Policy, inclua a URL pública da API em `script-src` e `connect-src`.

## Executar com Docker

```bash
cp .env.example .env
# Edite MONGODB_URI e REDIS_URL com as conexões dos serviços externos.
docker compose up --build
docker compose exec api npm run seed -w @akros/api
```

Depois, acesse:

- Interface: `http://localhost:3000`
- API: `http://localhost:4000/api/health`

O Compose inicia somente a interface e a API; MongoDB e Redis devem estar disponíveis externamente pelas URLs do `.env`. O `localhost` já consta como domínio autorizado nos dados de demonstração. Em produção, ajuste também `WEB_URL`, `API_PUBLIC_URL` e o proxy reverso.

`API_PUBLIC_URL` deve ser a URL HTTPS pública pela qual os sites rastreados acessam a API, por exemplo `https://analytics-api.seudominio.com`. Se a variável ficar vazia, a API gera o snippet usando o protocolo e o host da própria requisição. O Compose não sobrescreve esse valor.

## Executar para desenvolvimento

```bash
cp .env.example .env
# Configure MONGODB_URI e REDIS_URL para serviços já existentes.
npm install
npm run seed -w @akros/api
npm run dev
```

Para executar somente a API, também é possível entrar em `apps/api` e usar `npm run dev`. Esse comando gera o `tracker.js` antes de iniciar o servidor e não depende de ferramentas instaladas exclusivamente no pacote raiz.

Com `NODE_ENV=development`, a API exibe logs legíveis e detalhados no terminal:

- início e conclusão de cada requisição, com identificador, método, rota, status e tempo de resposta;
- origem, IP, user agent, tipo e tamanho do conteúdo, sem registrar os valores das query strings;
- validações rejeitadas e erros com stack trace;
- conexão e desconexão de MongoDB e Redis;
- operações de cache, incluindo acertos, falhas e invalidações.

Senhas, cookies, tokens, cabeçalhos de autorização e lotes de gravação são omitidos. Use `LOG_LEVEL=trace|debug|info|warn|error|fatal|silent` para sobrescrever o nível padrão. Em produção, o formato permanece JSON e o nível padrão é `info`.

## Regras de análise

- O período começa às `00:00` da data inicial no fuso do site.
- O limite final é exclusivo e corresponde às `00:00` do dia seguinte à data final.
- “Acessos reais” excluem eventos identificados como robôs.
- “Acessos totais” incluem todos os eventos.
- A localização por IP é aproximada; a cidade pode não estar disponível em redes privadas, VPNs ou determinados provedores.
- O mapa usa tiles do OpenStreetMap. Para alto volume, configure um provedor de tiles compatível com sua carga.
- As gravações não são arquivos de vídeo: o tracker captura alterações do DOM e eventos de interação para reconstruir a sessão no player.
- Inputs são mascarados por padrão. Use `data-akros-mask`, `data-akros-block` ou `data-akros-ignore` para ampliar a proteção de elementos específicos.
- A coleta de replay respeita Global Privacy Control e Do Not Track. A retenção é configurada por `REPLAY_RETENTION_DAYS` e aplicada por índice TTL no MongoDB.

## Endpoints principais

| Método | Rota | Finalidade |
|---|---|---|
| `GET/POST` | `/api/sites` | Listar e cadastrar sites |
| `GET/PATCH` | `/api/sites/:siteId` | Ler e alterar cadastro-base |
| `GET` | `/api/sites/:siteId/dashboard` | Indicadores por período |
| `GET` | `/api/sites/:siteId/query-keys/:key/values` | Valores de uma chave HTTP query |
| `GET/POST` | `/api/sites/:siteId/campaigns` | Listar e cadastrar campanhas |
| `GET` | `/api/sites/:siteId/campaigns/:campaignId/dashboard` | Dashboard da campanha |
| `GET` | `/api/sites/:siteId/recordings` | Listar e filtrar gravações |
| `GET/PATCH` | `/api/sites/:siteId/recordings/:sessionId` | Reproduzir e classificar uma gravação |
| `GET` | `/api/sites/:siteId/recordings/live` | Usuários ativos via SSE |
| `GET` | `/api/sites/:siteId/recordings/:sessionId/stream` | Novos eventos da sessão ao vivo via SSE |
| `GET` | `/api/sites/:siteId/integration` | Script individual do site |
| `GET` | `/tracker.js` | Biblioteca do rastreador |
| `POST` | `/v1/collect` | Coleta de visualizações |
| `POST` | `/v1/replay-events` | Coleta em lotes dos eventos de replay |

## Produção e privacidade

O IP é armazenado porque faz parte do requisito de coleta. Gravações de sessão ampliam o risco de exposição de dados pessoais: antes de produção, valide base legal e consentimento aplicáveis, defina retenção mínima, mantenha os seletores de mascaramento atualizados e restrinja o acesso aos replays. Use TLS, autenticação administrativa, secrets fora do repositório e restrição de rede para MongoDB e Redis.
