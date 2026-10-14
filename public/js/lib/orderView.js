// Reusable order visuals shared by the customer, rider and admin dashboards.
import { icon } from './icons.js';
import { esc, STATUS_FLOW, STATUS_LABEL, stamp } from './ui.js';

// Pickup -> delivery with a connecting line.
export const routeHtml = (o) => `
  <div class="route">
    <div class="route-stop"><span class="route-dot from"></span><div class="route-text"><small>Pickup</small><span class="truncate">${esc(o.pickup_address)}</span></div></div>
    <div class="route-stop"><span class="route-dot to"></span><div class="route-text"><small>Deliver to</small><span class="truncate">${esc(o.delivery_address)}</span></div></div>
  </div>`;

// 5-segment slim progress bar (order cards).
export function progressHtml(status) {
  const idx = STATUS_FLOW.indexOf(status);
  return `<div class="progress" role="img" aria-label="Progress: ${STATUS_LABEL[status]}">${STATUS_FLOW.map((_, i) =>
    `<i class="${i <= idx ? 'on' : ''}${i === idx && status !== 'DELIVERED' ? ' now' : ''}"></i>`).join('')}</div>`;
}

// Horizontal stepper. `labels` lets the rider view show action-oriented wording.
export function stepperHtml(status, labels = STATUS_LABEL) {
  const idx = STATUS_FLOW.indexOf(status);
  return `<div class="stepper" style="--n:${STATUS_FLOW.length}">${STATUS_FLOW.map((s, i) => {
    const cls = i < idx ? 'done' : i === idx ? `current${s === 'DELIVERED' ? ' final done' : ''}` : '';
    return `<div class="step ${cls}"><span class="dot">${icon('check')}</span><span>${labels[s]}</span></div>`;
  }).join('')}</div>`;
}

// Vertical timeline with real timestamps from statusHistory; future steps shown as to-do.
export function timelineHtml(history = [], status) {
  const at = Object.fromEntries(history.map((h) => [h.status, h.changed_at]));
  const idx = STATUS_FLOW.indexOf(status);
  return `<ol class="timeline">${STATUS_FLOW.map((s, i) => {
    const state = i < idx ? 'done' : i === idx ? 'done current' : 'todo';
    return `<li class="${state}"><span class="node">${icon('check')}</span>
      <div><div class="t-title">${STATUS_LABEL[s]}</div><div class="t-time">${at[s] ? stamp(at[s]) : 'Waiting'}</div></div></li>`;
  }).join('')}</ol>`;
}
