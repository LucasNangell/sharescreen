/**
 * Regras compartilhadas para fontes selecionf',veis na exibif',f',o.
 */
export function isSelectableSource(client) {
  return !!(
    client?.selectable ||
    client?.mediaReady?.video ||
    client?.isProducing ||
    client?.hasVideo ||
    client?.producerIds?.video ||
    client?.producerId ||
    client?.status === 'transmitindo'
  );
}

export function sortDisplaySources(clients) {
  return [...(clients || [])].sort((a, b) => {
    const aHost = a.ehHost || a.role === 'host';
    const bHost = b.ehHost || b.role === 'host';
    if (aHost && !bHost) return -1;
    if (!aHost && bHost) return 1;
    return (a.displayName || '').localeCompare(b.displayName || '', 'pt-BR');
  });
}
