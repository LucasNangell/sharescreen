/**
 * Presets de filtro de audio de clients, chaveados pelo nome de exibicao.
 */
import { normalizeMicrophoneFilterPrefs } from './mic-dsp.js';

export async function fetchClientAudioFilterPreset(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  try {
    const res = await fetch(
      `/api/audio-filter/${encodeURIComponent('client')}/${encodeURIComponent(trimmed)}`,
      { credentials: 'same-origin' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const prefs = data?.preset?.prefs;
    if (!prefs || typeof prefs !== 'object') return null;
    return normalizeMicrophoneFilterPrefs(prefs);
  } catch {
    return null;
  }
}
