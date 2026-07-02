/**
 * Cards de fontes de exibicao - estrutura e estados compartilhados entre host e client.
 */
function hasVideoAvailable(c) {
  return !!(
    c?.selectable ||
    c?.mediaReady?.video ||
    c?.isProducing ||
    c?.hasVideo ||
    c?.producerIds?.video ||
    c?.producerId ||
    c?.status === 'transmitindo'
  );
}

function isConnectedPeer(c) {
  return !!c?.id && c?.status !== 'desconectado';
}

export function getSourceCardState(c) {
  if (!hasVideoAvailable(c)) {
    if (isConnectedPeer(c)) {
      return {
        kind: 'viewer',
        description: 'Espectador - Participando sem compartilhar tela',
        statusText: 'Assistindo',
        blocked: true
      };
    }
    return {
      kind: 'spectator',
      description: 'Espectador - Participando com tela nao compartilhada',
      statusText: 'Tela nao disponivel',
      blocked: true
    };
  }
  if (c.selecionado) {
    return {
      kind: 'sharing',
      description: 'Transmitindo',
      statusText: 'Transmitindo',
      blocked: true
    };
  }
  return {
    kind: 'available',
    description: 'Disponivel - Participando com tela compartilhada',
    statusText: 'Tela disponivel',
    blocked: false
  };
}

export function formatSourceDisplayName(c) {
  return c.displayName || c.id || '';
}

function appendRoleBadge(nameWrap, c) {
  if (c.isCoHost) {
    const badge = document.createElement('span');
    badge.className = 'source-role-badge source-role-badge--cohost';
    badge.textContent = 'co-host';
    nameWrap.append(badge);
    return;
  }
  if (c.ehHost) {
    const badge = document.createElement('span');
    badge.className = 'source-role-badge source-role-badge--host';
    badge.textContent = 'host';
    nameWrap.append(badge);
  }
}

export function createSourceStatusBar(cardState, onActivate) {
  const bar = document.createElement('button');
  bar.type = 'button';
  bar.className = `source-status-bar source-status-bar--${cardState.kind}`;
  bar.textContent = cardState.statusText;
  bar.disabled = cardState.blocked;
  if (!cardState.blocked) {
    bar.addEventListener('click', (e) => {
      e.stopPropagation();
      onActivate();
    });
  }
  return bar;
}

/**
 * @param {object} c - fonte (id, displayName, isProducing, selecionado, ehHost, ...)
 * @param {(peerId: string) => void} onSelect
 * @param {{ decorateBody?: (body: HTMLElement, c: object) => void, decorateRow?: (row: HTMLElement, c: object) => void }} [options]
 */
export function buildDisplaySourceCard(c, onSelect, options = {}) {
  const cardState = getSourceCardState(c);
  const li = document.createElement('li');
  li.className = 'card card-selectable source-card';
  if (cardState.kind === 'sharing') {
    if (!options.noSharingHighlight) {
      li.classList.add('sharing');
    }
  }
  if (cardState.kind === 'spectator' || cardState.kind === 'viewer') {
    li.classList.add('disabled', 'spectator');
  }
  if (cardState.kind === 'available') li.classList.add('available');

  const body = document.createElement('div');
  body.className = 'source-card-body';
  options.decorateBody?.(body, c);

  const nameWrap = document.createElement('div');
  nameWrap.className = 'source-name-wrap';
  const name = document.createElement('div');
  name.className = 'source-name';
  name.textContent = formatSourceDisplayName(c);
  nameWrap.append(name);
  appendRoleBadge(nameWrap, c);
  body.append(nameWrap);

  const row = document.createElement('div');
  row.className = 'source-card-row';
  row.append(body);
  options.decorateRow?.(row, c);

  const activate = () => onSelect(c.id);
  const statusBar = createSourceStatusBar(cardState, activate);

  li.append(row, statusBar);
  if (!cardState.blocked) {
    li.addEventListener('click', activate);
  }
  return li;
}
