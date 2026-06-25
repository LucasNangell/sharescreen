const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

/** Padrão: YYYY MesMM DD HHhNN (horário de fim da gravação) */
export function formatRecordingFilename(endDate = new Date()) {
  const y = endDate.getFullYear();
  const m = endDate.getMonth();
  const mes = MESES[m] || 'Mes';
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(endDate.getDate()).padStart(2, '0');
  const hh = String(endDate.getHours()).padStart(2, '0');
  const nn = String(endDate.getMinutes()).padStart(2, '0');
  return `${y} ${mes}${mm} ${dd} ${hh}h${nn}.webm`;
}

export function isValidRecordingFilename(name) {
  if (!name || typeof name !== 'string') return false;
  const base = name.replace(/\\/g, '/').split('/').pop();
  return /^\d{4} [A-Za-zÀ-ÿçãõÇ]+\d{2} \d{2} \d{2}h\d{2}\.webm$/.test(base);
}
