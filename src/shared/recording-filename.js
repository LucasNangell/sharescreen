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

function formatLegacyRecordingFilename(endDate) {
  const y = endDate.getFullYear();
  const m = endDate.getMonth();
  const mes = MESES[m] || 'Mes';
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(endDate.getDate()).padStart(2, '0');
  const hh = String(endDate.getHours()).padStart(2, '0');
  const nn = String(endDate.getMinutes()).padStart(2, '0');
  return `${y} ${mes}${mm} ${dd} ${hh}h${nn}.webm`;
}

function buildRecordingFilenameVars(endDate) {
  const m = endDate.getMonth();
  return {
    YYYY: String(endDate.getFullYear()),
    MM: String(m + 1).padStart(2, '0'),
    DD: String(endDate.getDate()).padStart(2, '0'),
    HH: String(endDate.getHours()).padStart(2, '0'),
    NN: String(endDate.getMinutes()).padStart(2, '0'),
    MES: MESES[m] || 'Mes'
  };
}

/** Padrão legado: YYYY MesMM DD HHhNN (horário de fim da gravação); ou pattern customizado com variáveis. */
export function formatRecordingFilename(endDate = new Date(), pattern) {
  const trimmed = String(pattern ?? '').trim();
  if (!trimmed) {
    return formatLegacyRecordingFilename(endDate);
  }

  const vars = buildRecordingFilenameVars(endDate);
  let name = trimmed;
  for (const [key, value] of Object.entries(vars)) {
    const token = `{${key}}`;
    name = name.split(token).join(value);
  }
  if (!name.toLowerCase().endsWith('.webm')) {
    name += '.webm';
  }
  return name;
}

export function isValidRecordingFilename(name) {
  if (!name || typeof name !== 'string') return false;
  const base = name.replace(/\\/g, '/').split('/').pop();
  if (!base || base === '.' || base === '..') return false;
  if (!base.toLowerCase().endsWith('.webm')) return false;
  if (base.length > 200 || base.length <= 5) return false;
  if (/[<>:"|?*\x00-\x1f]/.test(base)) return false;
  if (base.includes('..')) return false;
  return true;
}
