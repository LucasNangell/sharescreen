export function updateStreamSourceBadge(el, name, visible = true) {
  if (!el) return;
  const show = visible && String(name || '').trim();
  if (!show) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.textContent = String(name).trim();
  el.hidden = false;
}
