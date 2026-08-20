/**
 * Painel profissional de filtros de áudio (channel strip).
 * Compartilhado entre host e co-host — HTML gerado aqui, não duplicado nos index.html.
 */
import {
  MIC_FILTER_DEFAULTS,
  MIC_FILTER_PRESETS,
  CLIENT_MIC_PUBLISH_DEFAULTS,
  HOST_MIC_PUBLISH_DEFAULTS,
  normalizeMicrophoneFilterPrefs,
  microphoneFilterPrefsSignature,
  volumeDbToGain,
  gainToVolumeDb
} from './mic-dsp.js';

const NR_LABELS = {
  off: 'Off',
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta'
};

function $(root, id) {
  return root?.querySelector?.(`#${id}`) || document.getElementById(id);
}

function formatVolumeDb(db) {
  const v = Number(db) || 0;
  if (Math.abs(v) < 0.05) return '0.0 dB';
  return `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`;
}

function dbToMeterPct(db) {
  // -60..0 dB → 0..100%
  return Math.max(0, Math.min(100, ((Number(db) + 60) / 60) * 100));
}

function matchPresetId(prefs) {
  const sig = microphoneFilterPrefsSignature(prefs);
  for (const [id, preset] of Object.entries(MIC_FILTER_PRESETS)) {
    if (microphoneFilterPrefsSignature(preset.prefs) === sig) return id;
  }
  return 'custom';
}

function drawEqCurve(canvas, prefs) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  const minF = 40;
  const maxF = 16000;
  const freqAt = (x) => minF * Math.pow(maxF / minF, x / w);
  const magDb = (f) => {
    let db = 0;
    if (prefs.highpass) {
      const fc = prefs.highpassFreq || 85;
      if (f < fc) db += -24 * Math.log2(fc / Math.max(f, 1));
    }
    const bass = prefs.bass || 0;
    db += bass / (1 + Math.pow(f / 150, 2));
    if (prefs.presence) {
      const pf = prefs.presenceFreq || 3000;
      const pg = prefs.presenceGain || 0;
      const q = 1.2;
      const x = (f / pf - pf / f) * q;
      db += pg / (1 + x * x);
    }
    const treble = prefs.treble || 0;
    db += treble * (1 - 1 / (1 + Math.pow(f / 4000, 2)));
    return clamp(db, -18, 18);
  };
  const yAt = (db) => h / 2 - (db / 18) * (h / 2 - 4);

  ctx.strokeStyle = 'var(--color-accent, #5b9dff)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    const y = yAt(magDb(freqAt(x)));
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function createAudioFiltersPanel(options = {}) {
  const hooks = options.hooks || {};
  const caps = {
    selfMonitor: false,
    ...options.capabilities
  };

  let root = null;
  let panelEl = null;
  let advanced = false;
  let bypass = false;
  let livePrefs = normalizeMicrophoneFilterPrefs(MIC_FILTER_DEFAULTS);
  let preBypassPrefs = null;
  let meterSource = null;
  let meterRaf = null;
  let onPrefsChange = null;
  let bound = false;

  function ensureDom() {
    root = options.getRoot?.() || document.getElementById('audio-filters-modal');
    if (!root) return null;
    panelEl = root.querySelector('.afx-panel') || root.querySelector('.modal-panel');
    if (!panelEl) {
      panelEl = document.createElement('div');
      panelEl.className = 'modal-panel afx-panel';
      root.appendChild(panelEl);
    }
    panelEl.classList.add('afx-panel');
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-labelledby', 'audio-filters-modal-title');
    return panelEl;
  }

  function renderShell() {
    const el = ensureDom();
    if (!el) return;
    el.innerHTML = `
      <header class="afx-header">
        <div class="afx-header-main">
          <h1 id="audio-filters-modal-title">Channel Strip</h1>
          <p class="afx-subtitle">Participante: <strong id="audio-filters-client-name">—</strong></p>
          <p id="audio-filters-note" class="afx-note">Filtros aplicados na origem. Todos ouvem o resultado.</p>
        </div>
        <div class="afx-header-actions">
          <button type="button" id="afx-btn-bypass" class="afx-chip" title="Comparar com sinal sem processamento">Bypass</button>
          <button type="button" id="afx-btn-mode" class="afx-chip afx-chip-primary">Avançado</button>
        </div>
      </header>

      <div class="afx-meters">
        <div class="afx-meter" data-meter="in">
          <span class="afx-meter-label">IN</span>
          <div class="afx-meter-bar"><div id="afx-meter-in-fill" class="afx-meter-fill"></div></div>
          <strong id="afx-meter-in-val" class="afx-meter-val">-∞</strong>
          <span id="afx-meter-clip" class="afx-led" title="Clip"></span>
        </div>
        <div class="afx-meter" data-meter="gate">
          <span class="afx-meter-label">GR</span>
          <div class="afx-meter-bar afx-meter-bar--gr"><div id="afx-meter-gr-fill" class="afx-meter-fill afx-meter-fill--gr"></div></div>
          <strong id="afx-meter-gr-val" class="afx-meter-val">0.0</strong>
          <span id="afx-gate-led" class="afx-led" title="Portão aberto"></span>
        </div>
        <div class="afx-meter" data-meter="out">
          <span class="afx-meter-label">OUT</span>
          <div class="afx-meter-bar"><div id="afx-meter-out-fill" class="afx-meter-fill"></div></div>
          <strong id="afx-meter-out-val" class="afx-meter-val">-∞</strong>
        </div>
      </div>
      <p id="afx-remote-hint" class="afx-hint" hidden>
        Medidor remoto: mostra o áudio já processado na origem. GR/portão só aparecem no microfone local.
      </p>

      <section class="afx-simple">
        <label class="afx-field">
          <span>Preset</span>
          <select id="afx-preset">
            <option value="clean">Voz limpa</option>
            <option value="shared">Sala compartilhada</option>
            <option value="noisy">Ambiente ruidoso</option>
            <option value="bypass">Sem processamento</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>

        <div class="afx-field">
          <div class="afx-field-row">
            <span>Redução de ruído</span>
            <strong id="afx-nr-val">Média</strong>
            <span id="afx-nr-led" class="afx-led" title="Atividade"></span>
          </div>
          <input id="afx-nr" type="range" min="0" max="3" step="1" value="2" />
          <div class="afx-ticks"><span>Off</span><span>Baixa</span><span>Média</span><span>Alta</span></div>
        </div>

        <div class="afx-field afx-volume">
          <div class="afx-field-row">
            <span>Volume</span>
            <strong id="afx-volume-val">0.0 dB</strong>
          </div>
          <div class="afx-fader-wrap">
            <input id="afx-volume" type="range" min="-40" max="9.5" step="0.5" value="0" />
            <div class="afx-fader-marks">
              <span style="left:0%">-40</span>
              <span class="afx-fader-zero" style="left:80.8%">0</span>
              <span style="left:100%">+9.5</span>
            </div>
          </div>
        </div>

        <label class="afx-check afx-check-inline">
          <input type="checkbox" id="afx-click-enabled" checked />
          Anti-teclado
          <span id="afx-click-led-simple" class="afx-led" title="Detecção de clique"></span>
        </label>
      </section>

      <section id="afx-advanced" class="afx-advanced" hidden>
        <fieldset class="afx-module">
          <legend><span class="afx-led" id="afx-led-filters"></span> Filtros</legend>
          <label class="afx-check"><input type="checkbox" id="afx-hp-enabled" /> Passa-alta</label>
          <div class="afx-field">
            <div class="afx-field-row"><span>Frequência</span><strong id="afx-hp-freq-val">85 Hz</strong></div>
            <input id="afx-hp-freq" type="range" min="50" max="300" step="5" value="85" />
          </div>
          <label class="afx-field">
            <span>Notch de zumbido</span>
            <select id="afx-hum">
              <option value="off">Off</option>
              <option value="50">50 Hz</option>
              <option value="60">60 Hz</option>
            </select>
          </label>
        </fieldset>

        <fieldset class="afx-module">
          <legend><span class="afx-led" id="afx-led-click"></span> Transientes</legend>
          <label class="afx-field">
            <span>Anti-teclado / cliques</span>
            <select id="afx-click">
              <option value="off">Off</option>
              <option value="low">Leve</option>
              <option value="medium">Médio</option>
              <option value="high">Forte</option>
            </select>
          </label>
          <p class="afx-hint">Remove batidas curtas de teclado e mouse sem alterar a voz.</p>
        </fieldset>

        <fieldset class="afx-module">
          <legend><span class="afx-led" id="afx-led-room"></span> Isolamento de sala</legend>
          <label class="afx-field">
            <span>Modo</span>
            <select id="afx-room">
              <option value="off">Off</option>
              <option value="soft">Suave</option>
              <option value="strict">Estrito</option>
            </select>
          </label>
          <div class="afx-field">
            <div class="afx-field-row"><span>Força</span><strong id="afx-room-strength-val">0.50</strong></div>
            <input id="afx-room-strength" type="range" min="0.35" max="0.75" step="0.05" value="0.5" />
          </div>
        </fieldset>

        <fieldset class="afx-module">
          <legend><span class="afx-led" id="afx-led-gate"></span> Portão</legend>
          <label class="afx-field">
            <span>Modo</span>
            <select id="afx-gate-mode">
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
              <option value="off">Off</option>
            </select>
          </label>
          <div class="afx-field" id="afx-gate-thresh-wrap">
            <div class="afx-field-row"><span>Limiar</span><strong id="afx-gate-thresh-val">-45 dB</strong></div>
            <input id="afx-gate-thresh" type="range" min="-70" max="-20" step="1" value="-45" />
          </div>
        </fieldset>

        <fieldset class="afx-module">
          <legend><span class="afx-led" id="afx-led-eq"></span> EQ</legend>
          <canvas id="afx-eq-canvas" width="420" height="72" class="afx-eq-canvas"></canvas>
          <div class="afx-field">
            <div class="afx-field-row"><span>Graves</span><strong id="afx-bass-val">0 dB</strong></div>
            <input id="afx-bass" type="range" min="-12" max="12" step="1" value="0" />
          </div>
          <label class="afx-check"><input type="checkbox" id="afx-presence-enabled" /> Presença</label>
          <div class="afx-field">
            <div class="afx-field-row"><span>Frequência</span><strong id="afx-presence-freq-val">3000 Hz</strong></div>
            <input id="afx-presence-freq" type="range" min="1000" max="5000" step="100" value="3000" />
          </div>
          <div class="afx-field">
            <div class="afx-field-row"><span>Ganho presença</span><strong id="afx-presence-gain-val">3 dB</strong></div>
            <input id="afx-presence-gain" type="range" min="0" max="12" step="1" value="3" />
          </div>
          <div class="afx-field">
            <div class="afx-field-row"><span>Agudos</span><strong id="afx-treble-val">0 dB</strong></div>
            <input id="afx-treble" type="range" min="-12" max="12" step="1" value="0" />
          </div>
        </fieldset>

        <fieldset class="afx-module">
          <legend><span class="afx-led" id="afx-led-dyn"></span> Dinâmica</legend>
          <label class="afx-field">
            <span>Compressor</span>
            <select id="afx-comp">
              <option value="off">Off</option>
              <option value="light">Leve</option>
              <option value="medium">Médio</option>
              <option value="strong">Forte</option>
            </select>
          </label>
          <label class="afx-check"><input type="checkbox" id="afx-limiter" checked /> Limitador</label>
        </fieldset>
      </section>

      <fieldset id="audio-self-monitor-section" class="afx-module afx-self-monitor" hidden>
        <legend>Monitorar meu microfone</legend>
        <label class="afx-check">
          <input type="checkbox" id="audio-self-monitor-enabled" />
          Ouvir o áudio publicado (como os clients ouvem)
        </label>
        <div class="afx-field">
          <div class="afx-field-row"><span>Volume do monitor</span><strong id="audio-self-monitor-volume-val">70%</strong></div>
          <input id="audio-self-monitor-volume" type="range" min="0" max="100" step="1" value="70" />
        </div>
        <p class="afx-hint">Use fones. Com caixas o retorno volta ao mic. Não é lembrado entre sessões.</p>
      </fieldset>

      <footer class="afx-footer">
        <button type="button" id="btn-audio-filters-reset" class="btn btn-ghost afx-danger">Resetar</button>
        <div class="afx-footer-right">
          <button type="button" id="btn-audio-filters-cancel" class="btn btn-ghost">Cancelar</button>
          <button type="button" id="btn-audio-filters-save" class="btn btn-primary">Salvar</button>
        </div>
      </footer>
    `;
  }

  function nrIndex(mode) {
    return ['off', 'low', 'medium', 'high'].indexOf(mode);
  }

  function nrFromIndex(i) {
    return ['off', 'low', 'medium', 'high'][clampIndex(i)] || 'off';
  }

  function clampIndex(i) {
    return Math.max(0, Math.min(3, Number(i) || 0));
  }

  function populate(prefs) {
    const p = normalizeMicrophoneFilterPrefs(prefs || {});
    livePrefs = p;
    const el = ensureDom();
    if (!el) return;

    const setText = (id, text) => {
      const node = $(el, id);
      if (node) node.textContent = text;
    };
    const setVal = (id, value) => {
      const node = $(el, id);
      if (node) node.value = value;
    };
    const setCheck = (id, checked) => {
      const node = $(el, id);
      if (node) node.checked = !!checked;
    };

    setVal('afx-volume', p.volume);
    setText('afx-volume-val', formatVolumeDb(p.volume));
    setVal('afx-nr', nrIndex(p.noiseReduction));
    setText('afx-nr-val', NR_LABELS[p.noiseReduction] || 'Off');

    setCheck('afx-click-enabled', p.clickSuppression !== 'off');
    setVal('afx-click', p.clickSuppression);

    setCheck('afx-hp-enabled', p.highpass);
    setVal('afx-hp-freq', p.highpassFreq);
    setText('afx-hp-freq-val', `${p.highpassFreq} Hz`);
    setVal('afx-hum', p.humFilter);

    setVal('afx-room', p.roomIsolation);
    setVal('afx-room-strength', p.roomIsolationStrength);
    setText('afx-room-strength-val', Number(p.roomIsolationStrength).toFixed(2));

    setVal('afx-gate-mode', p.gateMode);
    setVal('afx-gate-thresh', p.gateThreshold);
    setText('afx-gate-thresh-val', `${p.gateThreshold} dB`);
    const threshWrap = $(el, 'afx-gate-thresh-wrap');
    if (threshWrap) threshWrap.hidden = p.gateMode !== 'manual';

    setVal('afx-bass', p.bass);
    setText('afx-bass-val', `${p.bass} dB`);
    setCheck('afx-presence-enabled', p.presence);
    setVal('afx-presence-freq', p.presenceFreq);
    setText('afx-presence-freq-val', `${p.presenceFreq} Hz`);
    setVal('afx-presence-gain', p.presenceGain);
    setText('afx-presence-gain-val', `${p.presenceGain} dB`);
    setVal('afx-treble', p.treble);
    setText('afx-treble-val', `${p.treble} dB`);

    setVal('afx-comp', p.compressor);
    setCheck('afx-limiter', p.limiter);

    const preset = $(el, 'afx-preset');
    if (preset) preset.value = matchPresetId(p);

    updateLeds(p);
    drawEqCurve($(el, 'afx-eq-canvas'), p);
  }

  function readPrefs() {
    const el = ensureDom();
    if (!el) return normalizeMicrophoneFilterPrefs(livePrefs);
    const clickSelect = $(el, 'afx-click')?.value;
    const clickEnabled = !!$(el, 'afx-click-enabled')?.checked;
    let clickSuppression = clickSelect || 'medium';
    // Checkbox do modo Simples: liga em medium se estava off; desliga se unchecked.
    if (!clickEnabled) clickSuppression = 'off';
    else if (clickSuppression === 'off') clickSuppression = 'medium';
    return normalizeMicrophoneFilterPrefs({
      volume: Number($(el, 'afx-volume')?.value ?? 0),
      noiseReduction: nrFromIndex($(el, 'afx-nr')?.value),
      highpass: !!$(el, 'afx-hp-enabled')?.checked,
      highpassFreq: Number($(el, 'afx-hp-freq')?.value || 85),
      humFilter: $(el, 'afx-hum')?.value || 'off',
      clickSuppression,
      roomIsolation: $(el, 'afx-room')?.value || 'off',
      roomIsolationStrength: Number($(el, 'afx-room-strength')?.value || 0.5),
      gateMode: $(el, 'afx-gate-mode')?.value || 'off',
      gateThreshold: Number($(el, 'afx-gate-thresh')?.value || -45),
      bass: Number($(el, 'afx-bass')?.value || 0),
      presence: !!$(el, 'afx-presence-enabled')?.checked,
      presenceFreq: Number($(el, 'afx-presence-freq')?.value || 3000),
      presenceGain: Number($(el, 'afx-presence-gain')?.value || 3),
      treble: Number($(el, 'afx-treble')?.value || 0),
      compressor: $(el, 'afx-comp')?.value || 'off',
      limiter: !!$(el, 'afx-limiter')?.checked
    });
  }

  function updateLeds(p = livePrefs) {
    const el = ensureDom();
    if (!el) return;
    const setLed = (id, on) => $(el, id)?.classList.toggle('is-on', !!on);
    setLed('afx-led-filters', p.highpass || p.humFilter !== 'off');
    setLed('afx-led-click', p.clickSuppression !== 'off');
    setLed('afx-click-led-simple', p.clickSuppression !== 'off');
    setLed('afx-led-room', p.roomIsolation !== 'off');
    setLed('afx-led-gate', p.gateMode !== 'off');
    setLed('afx-led-eq', p.presence || Math.abs(p.bass) > 0 || Math.abs(p.treble) > 0);
    setLed('afx-led-dyn', p.compressor !== 'off' || p.limiter);
    setLed('afx-nr-led', p.noiseReduction !== 'off');
  }

  function emitChange() {
    if (bypass) return;
    livePrefs = readPrefs();
    updateLeds(livePrefs);
    drawEqCurve($(ensureDom(), 'afx-eq-canvas'), livePrefs);
    const preset = $(ensureDom(), 'afx-preset');
    if (preset && preset.value !== 'custom') {
      const matched = matchPresetId(livePrefs);
      if (matched !== preset.value) preset.value = 'custom';
    }
    onPrefsChange?.(livePrefs);
    hooks.onChange?.(livePrefs);
  }

  function setAdvanced(on) {
    advanced = !!on;
    const el = ensureDom();
    const adv = $(el, 'afx-advanced');
    const btn = $(el, 'afx-btn-mode');
    if (adv) adv.hidden = !advanced;
    if (btn) btn.textContent = advanced ? 'Simples' : 'Avançado';
    el?.classList.toggle('is-advanced', advanced);
  }

  function setBypass(on) {
    const el = ensureDom();
    const btn = $(el, 'afx-btn-bypass');
    if (on && !bypass) {
      preBypassPrefs = readPrefs();
      bypass = true;
      const flat = normalizeMicrophoneFilterPrefs(MIC_FILTER_PRESETS.bypass.prefs);
      flat.volume = preBypassPrefs.volume;
      onPrefsChange?.(flat);
      hooks.onChange?.(flat);
    } else if (!on && bypass) {
      bypass = false;
      if (preBypassPrefs) {
        populate(preBypassPrefs);
        onPrefsChange?.(preBypassPrefs);
        hooks.onChange?.(preBypassPrefs);
      }
      preBypassPrefs = null;
    }
    btn?.classList.toggle('is-active', bypass);
  }

  function stopMeters() {
    if (meterRaf) {
      cancelAnimationFrame(meterRaf);
      meterRaf = null;
    }
    meterSource = null;
  }

  function attachMeters(source) {
    stopMeters();
    meterSource = source || null;
    const el = ensureDom();
    const remoteHint = $(el, 'afx-remote-hint');
    const isLocal = !!(source && source.local);
    if (remoteHint) remoteHint.hidden = isLocal;

    const tick = () => {
      if (!meterSource) return;
      const meter = meterSource.getMeter?.() || meterSource.lastMeter || null;
      const inDb = meter?.inputRmsDb ?? meter?.rmsDb ?? null;
      const outDb = meter?.outputRmsDb ?? meter?.inputRmsDb ?? null;
      const gr = meter?.reductionDb ?? 0;
      const open = meter?.open !== false;
      const peak = meter?.inputPeakDb ?? inDb;

      const setMeter = (fillId, valId, db) => {
        const fill = $(el, fillId);
        const val = $(el, valId);
        if (fill) fill.style.width = `${db == null ? 0 : dbToMeterPct(db)}%`;
        if (val) val.textContent = db == null || !Number.isFinite(db) ? '-∞' : `${db.toFixed(1)}`;
      };
      setMeter('afx-meter-in-fill', 'afx-meter-in-val', inDb);
      setMeter('afx-meter-out-fill', 'afx-meter-out-val', outDb);
      const grFill = $(el, 'afx-meter-gr-fill');
      const grVal = $(el, 'afx-meter-gr-val');
      if (grFill) grFill.style.width = `${Math.min(100, Math.max(0, gr * 3))}%`;
      if (grVal) grVal.textContent = `${Number(gr || 0).toFixed(1)}`;
      $(el, 'afx-gate-led')?.classList.toggle('is-on', !!open && isLocal);
      $(el, 'afx-meter-clip')?.classList.toggle('is-on', peak != null && peak > -1);
      $(el, 'afx-nr-led')?.classList.toggle('is-pulse', gr > 3);
      const clickActive = !!(meter?.click?.active || (meter?.click?.depthDb || 0) > 1);
      $(el, 'afx-led-click')?.classList.toggle('is-pulse', clickActive && isLocal);
      $(el, 'afx-click-led-simple')?.classList.toggle('is-pulse', clickActive && isLocal);

      meterRaf = requestAnimationFrame(tick);
    };
    tick();
  }

  function bind() {
    const el = ensureDom();
    if (!el || bound) return;
    bound = true;

    el.addEventListener('input', (e) => {
      const id = e.target?.id;
      if (!id) return;
      if (id === 'afx-volume') {
        $(el, 'afx-volume-val').textContent = formatVolumeDb(e.target.value);
      } else if (id === 'afx-nr') {
        const mode = nrFromIndex(e.target.value);
        $(el, 'afx-nr-val').textContent = NR_LABELS[mode];
      } else if (id === 'afx-hp-freq') {
        $(el, 'afx-hp-freq-val').textContent = `${e.target.value} Hz`;
      } else if (id === 'afx-room-strength') {
        $(el, 'afx-room-strength-val').textContent = Number(e.target.value).toFixed(2);
      } else if (id === 'afx-gate-thresh') {
        $(el, 'afx-gate-thresh-val').textContent = `${e.target.value} dB`;
      } else if (id === 'afx-bass') {
        $(el, 'afx-bass-val').textContent = `${e.target.value} dB`;
      } else if (id === 'afx-presence-freq') {
        $(el, 'afx-presence-freq-val').textContent = `${e.target.value} Hz`;
      } else if (id === 'afx-presence-gain') {
        $(el, 'afx-presence-gain-val').textContent = `${e.target.value} dB`;
      } else if (id === 'afx-treble') {
        $(el, 'afx-treble-val').textContent = `${e.target.value} dB`;
      } else if (id === 'afx-gate-mode') {
        const wrap = $(el, 'afx-gate-thresh-wrap');
        if (wrap) wrap.hidden = e.target.value !== 'manual';
      } else if (id === 'afx-preset') {
        const key = e.target.value;
        if (key !== 'custom' && MIC_FILTER_PRESETS[key]) {
          populate(MIC_FILTER_PRESETS[key].prefs);
        }
      } else if (id === 'audio-self-monitor-volume') {
        const pct = Number(e.target.value) || 0;
        const val = $(el, 'audio-self-monitor-volume-val');
        if (val) val.textContent = `${pct}%`;
        hooks.onSelfMonitorVolume?.(pct / 100);
        return;
      }
      emitChange();
    });

    el.addEventListener('change', (e) => {
      const id = e.target?.id;
      if (id === 'audio-self-monitor-enabled') {
        hooks.onSelfMonitorToggle?.(!!e.target.checked);
        return;
      }
      if (id === 'afx-preset') {
        const key = e.target.value;
        if (key !== 'custom' && MIC_FILTER_PRESETS[key]) {
          populate(MIC_FILTER_PRESETS[key].prefs);
        }
      }
      if (id === 'afx-gate-mode') {
        const wrap = $(el, 'afx-gate-thresh-wrap');
        if (wrap) wrap.hidden = e.target.value !== 'manual';
      }
      if (id === 'afx-click-enabled') {
        const sel = $(el, 'afx-click');
        if (sel) {
          if (e.target.checked && sel.value === 'off') sel.value = 'medium';
          if (!e.target.checked) sel.value = 'off';
        }
      }
      if (id === 'afx-click') {
        const box = $(el, 'afx-click-enabled');
        if (box) box.checked = e.target.value !== 'off';
      }
      emitChange();
    });

    el.addEventListener('click', (e) => {
      const btn = e.target?.closest?.('button');
      if (!btn || !el.contains(btn)) return;
      if (btn.id === 'afx-btn-mode') {
        setAdvanced(!advanced);
      } else if (btn.id === 'afx-btn-bypass') {
        setBypass(!bypass);
      } else if (btn.id === 'btn-audio-filters-reset') {
        hooks.onReset?.();
      } else if (btn.id === 'btn-audio-filters-cancel') {
        hooks.onCancel?.();
      } else if (btn.id === 'btn-audio-filters-save') {
        hooks.onSave?.(readPrefs());
      }
    });
  }

  function open({ clientName, note, prefs, selfMonitor = false, onChange } = {}) {
    const el = ensureDom();
    if (!el) return null;
    // Só re-renderiza se o shell ainda não existe
    if (!$(el, 'audio-filters-modal-title')) {
      renderShell();
    }
    bind();
    onPrefsChange = onChange || null;
    bypass = false;
    preBypassPrefs = null;
    setAdvanced(false);

    const nameEl = $(el, 'audio-filters-client-name');
    if (nameEl) nameEl.textContent = clientName || '—';
    const noteEl = $(el, 'audio-filters-note');
    if (noteEl && note) noteEl.textContent = note;

    const selfSection = $(el, 'audio-self-monitor-section');
    if (selfSection) selfSection.hidden = !(caps.selfMonitor && selfMonitor);

    populate(prefs || MIC_FILTER_DEFAULTS);
    if (root) root.hidden = false;
    return readPrefs();
  }

  function close() {
    stopMeters();
    setBypass(false);
    if (root) root.hidden = true;
    onPrefsChange = null;
  }

  function destroy() {
    close();
    if (panelEl) panelEl.innerHTML = '';
    bound = false;
  }

  function syncSelfMonitor({ enabled = false, volume = 0.7 } = {}) {
    const el = ensureDom();
    const enabledEl = $(el, 'audio-self-monitor-enabled');
    const volumeEl = $(el, 'audio-self-monitor-volume');
    const volumeVal = $(el, 'audio-self-monitor-volume-val');
    if (enabledEl) enabledEl.checked = !!enabled;
    if (volumeEl) volumeEl.value = Math.round(volume * 100);
    if (volumeVal) volumeVal.textContent = `${Math.round(volume * 100)}%`;
  }

  return {
    open,
    close,
    destroy,
    populate,
    readPrefs,
    attachMeters,
    stopMeters,
    syncSelfMonitor,
    setAdvanced,
    get defaults() {
      return MIC_FILTER_DEFAULTS;
    },
    get hostDefaults() {
      return HOST_MIC_PUBLISH_DEFAULTS;
    },
    get clientDefaults() {
      return CLIENT_MIC_PUBLISH_DEFAULTS;
    }
  };
}

export {
  formatVolumeDb,
  volumeDbToGain,
  gainToVolumeDb,
  matchPresetId,
  MIC_FILTER_PRESETS
};
