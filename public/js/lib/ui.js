// Shared presentation helpers: escaping, badges, time, toasts, loading states, drawers, theme, count-up.
import { icon } from './icons.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* ---- order vocabulary ---- */
export const STATUS_FLOW = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
export const STATUS_LABEL = { PENDING: 'Pending', ACCEPTED: 'Accepted', PICKED_UP: 'Picked up', IN_TRANSIT: 'In transit', DELIVERED: 'Delivered' };
export const NEXT_STATUS = { ACCEPTED: 'PICKED_UP', PICKED_UP: 'IN_TRANSIT', IN_TRANSIT: 'DELIVERED' };
export const NEXT_ACTION = { ACCEPTED: 'Confirm pickup', PICKED_UP: 'Start delivery', IN_TRANSIT: 'Mark as delivered' };
export const PRIORITIES = ['NORMAL', 'HIGH', 'URGENT'];
export const PRIORITY_LABEL = { NORMAL: 'Normal', HIGH: 'High', URGENT: 'Urgent' };
export const PRIORITY_COLOR = { NORMAL: '#64748b', HIGH: '#f2a60c', URGENT: '#e5483b' };
export const ACTIVE_STATUSES = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];

export const statusBadge = (s) => `<span class="badge" data-status="${s}">${STATUS_LABEL[s] ?? esc(s)}</span>`;
export const priorityBadge = (p) =>
  `<span class="badge" data-priority="${p}">${p === 'URGENT' ? icon('flame') : p === 'HIGH' ? icon('zap') : ''}${PRIORITY_LABEL[p] ?? esc(p)}</span>`;

/* ---- time ---- */
export function timeAgo(iso) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso)) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}
export const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const stamp = (iso) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export function dayLabel(iso) {
  const d = new Date(iso); const t = new Date();
  const y = new Date(); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
export const formatKm = (km) => (km == null ? '-' : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
export const shortId = (id) => `#${id}`;

/* ---- people ---- */
export const initials = (name = '?') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
export function hue(name = '') { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
export const avatar = (name, size = '') => `<span class="avatar ${size}" style="--hue:${hue(name)}" title="${esc(name)}">${esc(initials(name))}</span>`;

/* ---- toasts ---- */
export function toast(title, { body = '', kind = 'info', ms = 4200 } = {}) {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `<span class="t-icon">${icon(kind === 'error' ? 'alert' : kind === 'success' ? 'check' : 'info', 'sm')}</span>
    <div><div class="t-title">${esc(title)}</div>${body ? `<div class="t-body">${esc(body)}</div>` : ''}</div>`;
  box.appendChild(el);
  const kill = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 320); };
  el.addEventListener('click', kill);
  setTimeout(kill, ms);
}

/* ---- async button helper: spinner while running, errors become toasts ---- */
export async function run(btn, fn, { error = true } = {}) {
  btn?.classList.add('is-loading'); if (btn) btn.disabled = true;
  try { return await fn(); }
  catch (err) { if (error) toast(err.message, { kind: 'error' }); return null; }
  finally { btn?.classList.remove('is-loading'); if (btn) btn.disabled = false; }
}

/* ---- animated number ---- */
export function countUp(el, to, { duration = 800 } = {}) {
  if (!el) return;
  const target = Number(to) || 0;
  const from = Number(el.dataset.v ?? 0);
  el.dataset.v = target;
  if (from === target) { el.textContent = target.toLocaleString(); return; }
  if (reducedMotion()) { el.textContent = target.toLocaleString(); return; }
  cancelAnimationFrame(el._raf);
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / duration);
    const e = 1 - Math.pow(1 - k, 4);
    el.textContent = Math.round(from + (target - from) * e).toLocaleString();
    if (k < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

/* ---- segmented control with a sliding thumb. buttons: <button data-value="..."> ---- */
export function initSeg(root, onChange) {
  if (!root.querySelector('.thumb')) root.insertAdjacentHTML('afterbegin', '<span class="thumb"></span>');
  const btns = () => $$('button[data-value]', root);
  const place = () => {
    const sel = btns().find((b) => b.getAttribute('aria-selected') === 'true') || btns()[0];
    if (!sel) return;
    root.style.setProperty('--x', `${sel.offsetLeft}px`);
    root.style.setProperty('--w', `${sel.offsetWidth}px`);
  };
  const set = (value, silent) => {
    btns().forEach((b) => b.setAttribute('aria-selected', String(b.dataset.value === value)));
    place();
    if (!silent) onChange?.(value);
  };
  root.setAttribute('role', 'tablist');
  root.addEventListener('click', (e) => { const b = e.target.closest('button[data-value]'); if (b) set(b.dataset.value); });
  new ResizeObserver(place).observe(root);
  requestAnimationFrame(place);
  document.fonts?.ready.then(place);
  return { set, place, get value() { return btns().find((b) => b.getAttribute('aria-selected') === 'true')?.dataset.value; } };
}

/* ---- slide-over drawer ---- */
export function openDrawer({ title = '', subtitle = '', body = '', headExtra = '', onClose } = {}) {
  const back = document.createElement('div');
  back.className = 'backdrop';
  const dr = document.createElement('aside');
  dr.className = 'drawer';
  dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-modal', 'true');
  dr.innerHTML = `
    <header class="drawer-head">
      <div style="min-width:0"><div class="drawer-title" style="font:700 17px var(--font-display);display:flex;align-items:center;gap:10px;flex-wrap:wrap">${title}</div>${subtitle ? `<div class="muted" style="font-size:13px;margin-top:2px">${subtitle}</div>` : ''}</div>
      <div style="display:flex;gap:6px;align-items:center">${headExtra}<button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Close">${icon('x')}</button></div>
    </header>
    <div class="drawer-body"></div>`;
  const bodyEl = dr.querySelector('.drawer-body');
  if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
  document.body.append(back, dr);
  document.body.style.overflow = 'hidden';
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    back.classList.add('closing'); dr.classList.add('closing');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => { back.remove(); dr.remove(); document.body.style.overflow = ''; onClose?.(); }, 300);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('click', close);
  dr.querySelector('[data-close]').addEventListener('click', close);
  return { el: dr, body: bodyEl, close, setTitle: (html) => { dr.querySelector('.drawer-title').innerHTML = html; } };
}

/* ---- theme ---- */
export function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'light'; }
export function setTheme(t) {
  const root = document.documentElement;
  root.setAttribute('data-theme', t);
  try { localStorage.setItem(`lp-theme-${root.getAttribute('data-role') || 'user'}`, t); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
}
export const toggleTheme = () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark');

/* ---- empty / skeleton snippets ---- */
export const emptyState = (iconName, title, text, action = '') =>
  `<div class="empty"><div class="empty-art">${icon(iconName)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
export const skeletonCards = (n = 3, h = 120) =>
  Array.from({ length: n }, () => `<div class="card skeleton" style="height:${h}px;border-radius:16px"></div>`).join('');
