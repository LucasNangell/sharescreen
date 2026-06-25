# Plano: client externo como client completo (/meet ≡ /client)

**Premissa:** `/meet` já está configurado no Nginx e serve a mesma SPA de `/client`. Não alterar Nginx nem Express para resolver `/meet`.

**Diagnóstico:** O servidor não diferencia client externo de local. A restrição era 100% no frontend (`src/client/app.js`).

**Status:** Implementado — token na URL = autenticação; `viewerOnly` reservado a espectadores reais.

---

## Onde o externo era diferenciado do local

| Camada | Diferencia externo? | Detalhe |
|--------|---------------------|---------|
| Nginx `/meet` → `/client` | Não (infra) | Mesma SPA |
| `server/auth-dev.js` | Só auth | `viewerToken` válido dispensa PIN; não define papel |
| `server/signaling.js` | Não | `entrar` com `papel: 'client'`; produce/consume iguais |
| `server/room-manager.js` | Não | Peer normal; aparece em `getHostState()` ao publicar |
| `src/client/app.js` | **Era a causa raiz** | `token` na URL forçava `viewerOnly = true` |

---

## Causa raiz (corrigida)

Em `src/client/app.js`, a presença de `?token=` acionava:

- `configureExternalViewerUi()` — escondia botões de compartilhamento
- `viewerOnly = true`
- `bootstrap(true)` — apenas `recvTransport`, sem publicação

O `viewerToken` no payload `entrar` **permanece** para autenticação (bypass PIN). Não indica modo espectador.

---

## Correção aplicada

**Arquivo alterado:** `src/client/app.js`

| Função / bloco | Alteração |
|----------------|-----------|
| `hasExternalAccessToken` (ex-`autoExternalGuestEntry`) | Token = auth externa, não viewer |
| `initOnboarding()` bloco token | Fluxo local: pré-preenche `?nome`, chama `salvarEIniciar(false)` ou `showIdentifyStep()` |
| `initOnboarding()` bloco `autoViewerEntry` | Inalterado — viewer real |
| `configureExternalViewerUi()` | Chamada apenas para viewer (`?viewer=1`, checkbox) |
| `salvarEIniciar(true)` | Inalterado — viewer manual |

**Comportamento `/meet?token=...&nome=...`:**

1. Autentica com `viewerToken` no `entrar`.
2. Onboarding normal (identify → capture → audio).
3. Com `nome` na URL: inicia `salvarEIniciar(false)` → `captureScreenFirst()`.
4. Consumo tardio via `transmissaoAtiva` + `fontesAudio` (snapshot pós-join).

---

## Arquivos inspecionados — sem alteração

- `src/shared/media-client.js`
- `src/shared/audio-manager.js`
- `src/shared/signaling-client.js`
- `src/shared/host-audio-monitor.js`
- `server/signaling.js`
- `server/room-manager.js`
- `server/auth-dev.js`
- `src/host/app.js`

---

## Eventos WebSocket envolvidos

**Entrada e auth:**

- `entrar` `{ papel:'client', nome, viewerToken, pin? }`
- `entrou` `{ peerId, rtpCapabilities, videoQuality }`
- Snapshot: `transmissaoAtiva`, `fontesAudio`

**Publicação (externo como client):**

- `criarTransporte` (send) → `transporteCriado`
- `conectarTransporte` → `transporteConectado`
- `produzir` → `produzido`
- `status` `{ status:'transmitindo' }`

**Consumo tardio:**

- `transmissaoAtiva` → `consumir` → `consumido` → `#video-remoto`
- `fontesAudio` → `syncClientAudioMonitor` → `#audio-remoto`

**Host ouve externo:**

- `produzir` (audio) → `broadcastAudioSources` → `fontesAudio` → `syncHostAudioMonitor`

**Seleção pelo host:**

- `selecionarClient` → `transmissaoAtiva` → `runTransmission` no client

---

## Preservar viewer real

| Entrada | Auth | Papel |
|---------|------|-------|
| `/client` local | PIN (se configurado) | client completo |
| `/meet?token&nome` | `viewerToken` | client completo |
| `/client?viewer=1` | PIN ou nenhum | espectador |
| Checkbox viewer | n/a | espectador |

Não usar `token` como indicador de viewer.

---

## Testes obrigatórios

1. **Meet ≡ client (auth):** `/meet?token=VALID&nome=Externo1` — onboarding completo; sem PIN.
2. **Publicar tela externa:** Host vê client com `isProducing/hasVideo`.
3. **Publicar microfone externo:** Host ouve; `fontesAudio` inclui externo.
4. **Host seleciona externo:** Vídeo no host e demais clients; estado `selected` no externo.
5. **Entrada tardia — vídeo:** Transmissão ativa → externo entra → `#video-remoto` reproduz.
6. **Entrada tardia — áudio:** Áudio ativo → externo ouve após `fontesAudio`.
7. **Externo ouve host:** Mic do host → `syncClientAudioMonitor` no externo.
8. **Viewer real intacto:** `/client?viewer=1` — só consume; sem botão share.
9. **Reconexão:** Externo publicando → F5 → republica vídeo/mic.
10. **Token inválido:** `/meet?token=INVALID` — erro auth; não modo client silencioso.

---

## Fora do escopo

- Rota `/meet` no Express
- Refatoração de `viewerLinkTokens` no backend
- Alterações em `media-client.js`, servidor ou host (salvo bug em teste)
