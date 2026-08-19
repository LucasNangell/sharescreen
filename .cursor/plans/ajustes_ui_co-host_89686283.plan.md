---
name: Ajustes UI co-host
overview: Remover o slider de volume da sidebar do co-host, igualar o modal de filtros ao do host, e garantir badge "co-host" no card mais a possibilidade de o host desligar a função a qualquer momento.
todos:
  - id: remove-volume-slider
    content: "Remover #controles-audio / #volume-slider da sidebar em public/client/index.html"
    status: completed
  - id: copy-host-audio-modal
    content: "Substituir #audio-filters-modal do client pelo markup do host, sem audio-self-monitor-section"
    status: completed
  - id: cohost-badge-and-revoke
    content: Preservar isCoHost no merge do roster, renderizar o badge no card e permitir o host revogar co-host a qualquer momento via menu de contexto
    status: completed
  - id: rebuild-client-html
    content: Rodar npm run build e conferir HTML, badge e toggle de co-host
    status: completed
isProject: false
---

# Ajustes visuais da sidebar e do modal de filtros do co-host

## 1. Remover o volume-slider

No host o bloco já está comentado ([`public/host/index.html`](public/host/index.html) linhas 547–549). No client ele ainda existe:

```615:617:public/client/index.html
                <div class="transmission-right-vu" id="controles-audio" hidden>
                  <input id="volume-slider" type="range" min="0" max="100" value="100" ... />
                </div>
```

Apagar o `div#controles-audio` inteiro (incluindo `#volume-slider`). O mute da transmissão continua em `#btn-mute-audio`.

## 2. Modal de filtros igual ao do host

Substituir o modal compacto em [`public/client/index.html`](public/client/index.html) (linhas 792–841) pelo markup de [`public/host/index.html`](public/host/index.html) linhas 891–1076:

- mesmos fieldsets, legends, labels, hints e estilos inline
- mesmos IDs (`audio-gain`, `audio-hp-enabled`, etc.) para o JS compartilhado continuar funcionando
- **omitir** `#audio-self-monitor-section` (monitor do mic publicado é só do host)
- manter os botões Resetar / Cancelar / Salvar com o mesmo estilo do host (Resetar em vermelho)

## 3. Badge "co-host" no card e revogação a qualquer momento

O badge já existe em [`src/shared/source-cards.js`](src/shared/source-cards.js) (`appendRoleBadge` usa `c.isCoHost` e a classe `source-role-badge--cohost`). O menu do host já envia o toggle:

```4923:4926:src/host/app.js
$('ctx-cohost')?.addEventListener('click', () => {
  const targetState = !activeContextClient.isCoHost;
  signaling.send('definirCoHost', { peerId: activeContextClient.id, ativo: targetState });
```

A falha é de estado: `mergeRoomClientEntry` em [`src/shared/transmission.js`](src/shared/transmission.js) prefere a entrada local com score maior e **não trata `isCoHost` como autoritativo**. Depois da promoção, o roster do host pode continuar com `isCoHost: false`. Consequências:

- o card não ganha o badge
- o clique seguinte no menu ainda envia `ativo: true`
- o servidor (`setCoHost` idempotente) não demove — o host parece não conseguir desligar

Correções:

- Em `mergeRoomClientEntry`, copiar `isCoHost` e `permissions.isCoHost` da entrada **incoming** quando o campo vier no snapshot (boolean explícito), em vez de deixar o merge por score ganhar.
- Após `definirCoHost` no host (e no `room-controls` se o item existir), atualizar imediatamente `estado.clients[].isCoHost` e chamar `renderLista()`, sem esperar o próximo snapshot.
- No menu de contexto, manter `#ctx-cohost` visível em todo card de client (nunca esconder depois de promover). Com `is-active`, o texto deve ser "Remover co-host"; senão "Tornar co-host".
- Confirmar que `setCoHost(..., false)` no servidor continua removendo identidade persistida, `displayControllerIds` e enviando `demovidoCoHost` — não alterar mídia/`selectedPeerId`.

## 4. Verificação

Rodar `npm run build`. Conferir:

- sidebar do co-host sem slider vertical
- modal de filtros visualmente igual ao do host (sem self-monitor)
- ao promover, o card no painel host mostra o badge "co-host"
- o host consegue remover co-host de novo pelo mesmo menu, a qualquer momento, sem afetar a transmissão
