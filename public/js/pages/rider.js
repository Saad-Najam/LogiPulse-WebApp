import { api } from '/js/lib/api.js';
import { requireRole } from '/js/lib/session.js';
import { mountTopbar } from '/js/lib/shell.js';
import { icon } from '/js/lib/icons.js';
import { poll, connect } from '/js/lib/live.js';
import { reconcile } from '/js/lib/list.js';
import { createMap, pinIcon, riderIcon, animateMarker, fitPoints, KARACHI } from '/js/lib/map.js';
import { haversineDistance, withDistance } from '/js/lib/haversine.js';
import { mountChat } from '/js/lib/chat.js';
import { routeHtml, stepperHtml } from '/js/lib/orderView.js';
import {
  $, $$, esc, avatar, statusBadge, priorityBadge, timeAgo, formatKm, toast, run, initSeg, emptyState,
  NEXT_STATUS, NEXT_ACTION, STATUS_LABEL, PRIORITY_LABEL,
} from '/js/lib/ui.js';

const session = requireRole('rider');
const me = { role: 'rider', id: session.user.id };

/* ---------------------------------------------------------------- shell */
mountTopbar($('#topbar'), session, {
  center: `<label class="avail" id="avail"><span class="switch"><input type="checkbox" id="avail-input" aria-label="Available for deliveries" /><i class="track"></i><i class="knob"></i></span><strong id="avail-label">Offline</strong></label>`,
});
$('#loc-ico').innerHTML = icon('navigation');
$('#gps-btn').innerHTML = `${icon('locate', 'sm')} Use GPS`;
$('#fab-fit').innerHTML = icon('route');
$('#fab-locate').innerHTML = icon('locate');
$('#hint-ico').innerHTML = icon('pin', 'sm');
$('#offline-art').innerHTML = icon('bike');

/* ---------------------------------------------------------------- state */
const state = {
  rider: null,
  loc: { lat: KARACHI[0], lng: KARACHI[1] },
  open: [],          // pending orders (raw from API)
  active: null,      // my undelivered order
  filter: 'ALL',
  selectedId: null,
  loaded: false,
  locations: [],
};
let locHoldUntil = 0; // after the rider moves themselves, ignore the (older) server position briefly
const knownIds = new Set();
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ---------------------------------------------------------------- map */
const mapCtl = createMap($('#map'), { center: KARACHI, zoom: 12, zoomControl: true });
const map = mapCtl.map;
const youMarker = L.marker([state.loc.lat, state.loc.lng], { icon: riderIcon(true), draggable: true, zIndexOffset: 1000, title: 'You' }).addTo(map);
const pins = new Map();       // order id -> marker
let routeLine = null;
let activePin = null;

youMarker.on('dragend', () => { const p = youMarker.getLatLng(); setLocation(p.lat, p.lng); });
map.on('click', (e) => setLocation(e.latlng.lat, e.latlng.lng));
$('#fab-fit').addEventListener('click', () => fitAll());
$('#fab-locate').addEventListener('click', (e) => gps(e.currentTarget));
$('#gps-btn').addEventListener('click', (e) => gps(e.currentTarget));
setTimeout(() => $('#map-hint')?.classList.add('gone'), 14000);
map.once('click', () => $('#map-hint')?.classList.add('gone'));

function fitAll() {
  const pts = [[state.loc.lat, state.loc.lng]];
  if (state.active) pts.push([state.active.pickup_lat, state.active.pickup_lng]);
  else pts.push(...visibleOrders().slice(0, 4).map((o) => [o.pickup_lat, o.pickup_lng]));
  fitPoints(map, pts, { padding: [70, 70], maxZoom: 14 });
}

function drawRoute(to) {
  routeLine?.remove(); routeLine = null;
  if (!to) return;
  routeLine = L.polyline([[state.loc.lat, state.loc.lng], to], { color: cssVar('--accent'), weight: 4, opacity: .9, className: 'route-anim', lineCap: 'round' }).addTo(map);
}

function syncPins() {
  const orders = state.active ? [] : visibleOrders();
  const want = new Set(orders.map((o) => o.id));
  for (const [id, m] of pins) if (!want.has(id)) { m.remove(); pins.delete(id); }
  for (const o of orders) {
    const label = o.distance_km < 10 ? o.distance_km.toFixed(1) : String(Math.round(o.distance_km));
    const icn = pinIcon({ label, priority: o.priority, active: o.id === state.selectedId });
    let m = pins.get(o.id);
    if (!m) {
      m = L.marker([o.pickup_lat, o.pickup_lng], { icon: icn, riseOnHover: true, title: `Order #${o.id}` }).addTo(map);
      m.on('click', (ev) => { L.DomEvent.stopPropagation(ev); selectOrder(o.id, { scroll: true }); });
      pins.set(o.id, m);
    } else m.setIcon(icn);
    m.setZIndexOffset(o.id === state.selectedId ? 900 : o.priority === 'URGENT' ? 400 : o.priority === 'HIGH' ? 200 : 0);
  }
  // active-delivery pickup pin
  if (state.active) {
    const a = state.active;
    if (!activePin) activePin = L.marker([a.pickup_lat, a.pickup_lng], { icon: pinIcon({ label: 'A', priority: a.priority }), interactive: false }).addTo(map);
    else activePin.setLatLng([a.pickup_lat, a.pickup_lng]);
  } else if (activePin) { activePin.remove(); activePin = null; }
}

/* ---------------------------------------------------------------- location */
function nearestPlaceName(lat, lng) {
  let best = null;
  for (const l of state.locations) {
    const d = haversineDistance(lat, lng, l.lat, l.lng);
    if (!best || d < best.d) best = { d, l };
  }
  if (best && best.d < 3) return best.d < 0.25 ? best.l.name : `Near ${best.l.name}`;
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
function paintLocation() {
  $('#loc-name').textContent = nearestPlaceName(state.loc.lat, state.loc.lng);
  $('#loc-hint').textContent = `${state.loc.lat.toFixed(5)}, ${state.loc.lng.toFixed(5)}  ·  tap the map to move`;
}

let locToast = 0;
async function setLocation(lat, lng) {
  lat = +lat.toFixed(6); lng = +lng.toFixed(6);
  state.loc = { lat, lng };
  locHoldUntil = Date.now() + 6000;
  animateMarker(youMarker, [lat, lng], 450);
  paintLocation();
  renderList();          // distances + order recalculated instantly, client-side Haversine
  syncPins();
  if (state.active) { renderActive(); drawRoute(state.active.status === 'ACCEPTED' ? [state.active.pickup_lat, state.active.pickup_lng] : null); }
  else if (state.selectedId) { const o = visibleOrders().find((x) => x.id === state.selectedId); drawRoute(o ? [o.pickup_lat, o.pickup_lng] : null); }
  try { await api.setLocation(lat, lng); if (Date.now() - locToast > 4000) { locToast = Date.now(); toast('Location updated', { kind: 'success', body: 'Distances recalculated from your new position.' }); } }
  catch (err) { toast(err.message, { kind: 'error' }); }
}

function gps(btn) {
  if (!navigator.geolocation) return toast('GPS is not available in this browser', { kind: 'error' });
  btn.classList.add('is-loading');
  navigator.geolocation.getCurrentPosition(
    (pos) => { btn.classList.remove('is-loading'); setLocation(pos.coords.latitude, pos.coords.longitude); map.flyTo([pos.coords.latitude, pos.coords.longitude], 14, { duration: 0.9 }); },
    () => { btn.classList.remove('is-loading'); toast('Could not read your GPS position', { kind: 'error', body: 'Allow location access, or tap the map to place yourself.' }); },
    { enableHighAccuracy: true, timeout: 9000 },
  );
}

/* ---------------------------------------------------------------- data */
const live = connect(session.token, (ev, p) => {
  if (['order:new', 'order:accepted', 'order:priority_changed', 'order:status_updated'].includes(ev)) poller.refresh();
});

const poller = poll(async () => {
  const [rider, open, active] = await Promise.all([api.riderMe(), api.availableOrders(), api.activeOrder()]);
  const first = !state.loaded;
  state.rider = rider;
  if (Date.now() > locHoldUntil && rider.current_lat != null) {
    const moved = rider.current_lat !== state.loc.lat || rider.current_lng !== state.loc.lng;
    state.loc = { lat: rider.current_lat, lng: rider.current_lng };
    if (moved) animateMarker(youMarker, [state.loc.lat, state.loc.lng], 600);
  }
  // announce brand-new requests (after the first load)
  if (!first && !active) {
    const fresh = open.filter((o) => !knownIds.has(o.id));
    for (const o of fresh) {
      const km = haversineDistance(state.loc.lat, state.loc.lng, o.pickup_lat, o.pickup_lng);
      toast(`New ${o.priority !== 'NORMAL' ? PRIORITY_LABEL[o.priority].toLowerCase() + ' ' : ''}request · ${formatKm(km)} away`, { kind: o.priority === 'URGENT' ? 'error' : 'info', body: `#${o.id} · ${o.pickup_address}` });
    }
  }
  open.forEach((o) => knownIds.add(o.id));
  state.open = open;
  const prevActive = state.active;
  state.active = active;
  state.loaded = true;
  paintLocation();
  render(first || prevActive?.id !== active?.id);
}, 3500);

api.locations().then((l) => { state.locations = l; paintLocation(); }).catch(() => {});

/* ---------------------------------------------------------------- derived */
const online = () => !!state.active || !!state.rider?.is_available;
const ranked = () => withDistance(state.open, state.loc.lat, state.loc.lng);
const visibleOrders = () => ranked().filter((o) => state.filter === 'ALL' || o.priority === state.filter);

/* ---------------------------------------------------------------- availability switch */
const availEl = $('#avail'), availInput = $('#avail-input');
availInput.addEventListener('change', async () => {
  const want = availInput.checked;
  try { await api.setAvailability(want); state.rider.is_available = want; toast(want ? 'You are online' : 'You are offline', { kind: want ? 'success' : 'info' }); render(true); poller.refresh(); }
  catch (err) { availInput.checked = !want; toast(err.message, { kind: 'error' }); }
});
$('#go-online').addEventListener('click', () => { availInput.checked = true; availInput.dispatchEvent(new Event('change')); });

/* ---------------------------------------------------------------- render */
const sec = { list: $('#sec-list'), active: $('#sec-active'), offline: $('#sec-offline') };
let mode = null;

function render(forceMode) {
  const isOnline = online();
  availInput.checked = isOnline;
  availInput.disabled = !!state.active;
  availEl.classList.toggle('online', isOnline);
  availEl.classList.toggle('locked', !!state.active);
  availEl.title = state.active ? 'Finish your delivery to go offline' : '';
  $('#avail-label').textContent = isOnline ? 'Online' : 'Offline';

  const next = state.active ? 'active' : isOnline ? 'list' : 'offline';
  if (next !== mode || forceMode) {
    const changed = next !== mode;
    mode = next;
    for (const [k, el] of Object.entries(sec)) el.classList.toggle('hidden', k !== mode);
    if (changed) {
      sec[mode].style.animation = 'none'; void sec[mode].offsetWidth; sec[mode].style.animation = '';
      if (mode !== 'active') teardownChat();
      if (mode === 'active') { state.selectedId = null; }
      requestAnimationFrame(() => { fitAll(); });
    }
  }
  renderList();
  renderActive();
  syncPins();
  if (state.active) drawRoute(state.active.status === 'ACCEPTED' ? [state.active.pickup_lat, state.active.pickup_lng] : null);
}

/* ---------------------------------------------------------------- list mode */
const listEl = $('#rlist');
const prioSeg = initSeg($('#prio-seg'), (v) => { state.filter = v; state.selectedId = null; drawRoute(null); renderList(); syncPins(); fitAll(); });

function cardHtml(o, idx) {
  const near = idx === 0 && state.filter === 'ALL' ? `<span class="near-chip">${icon('navigation', 'sm')} Nearest</span>` : '';
  const km = o.distance_km;
  const val = km < 1 ? Math.round(km * 1000) : km.toFixed(1);
  const unit = km < 1 ? 'm' : 'km';
  return `
    <div class="rc-head">
      <div><div class="dist"><b>${val}</b><span>${unit}</span></div><div class="dist-sub">from you ${near}</div></div>
      <div style="display:flex;gap:8px;align-items:center">${priorityBadge(o.priority)}</div>
    </div>
    ${routeHtml(o)}
    <div class="rc-meta"><span class="oc-desc">${icon('package', 'sm')}<span class="truncate">${esc(o.description || 'No details')}</span></span><span>${timeAgo(o.created_at)} · ${esc(o.user_name.split(' ')[0])}</span></div>
    <div class="rc-actions"><button class="btn btn-primary" data-accept="${o.id}">${icon('check', 'sm')} Accept order #${o.id}</button></div>`;
}

function renderList() {
  if (mode !== 'list') return;
  const all = ranked();
  const counts = { ALL: all.length, URGENT: 0, HIGH: 0, NORMAL: 0 };
  all.forEach((o) => counts[o.priority]++);
  for (const k of Object.keys(counts)) $(`#n-${k}`).textContent = counts[k];
  $('#open-count').textContent = `${all.length} open`;
  prioSeg.place();

  const items = visibleOrders();
  if (state.selectedId && !items.some((o) => o.id === state.selectedId)) { state.selectedId = null; drawRoute(null); }
  if (state.loaded) listEl.querySelectorAll('.skeleton').forEach((s) => s.remove());
  const rankOf = new Map(items.map((o, i) => [o.id, i]));
  reconcile(listEl, items, {
    key: (o) => o.id,
    tag: 'article',
    className: 'order-card rcard',
    // distance is part of the signature, so the card text refreshes whenever the rider moves
    sig: (o) => `${o.id}|${o.priority}|${o.distance_km.toFixed(2)}|${rankOf.get(o.id) === 0 && state.filter === 'ALL'}|${o.description}`,
    render: (o) => cardHtml(o, rankOf.get(o.id)),
    flash: false,
    attrs: (el, o) => {
      for (const p of ['HIGH', 'URGENT']) el.classList.toggle(`prio-${p}`, o.priority === p);
      el.classList.toggle('selected', o.id === state.selectedId);
      el.dataset.id = o.id; el.tabIndex = 0;
    },
  });
  $('#rempty').innerHTML = state.loaded && !items.length
    ? emptyState('inbox', state.filter === 'ALL' ? 'No requests right now' : `No ${PRIORITY_LABEL[state.filter].toLowerCase()} requests`,
      state.filter === 'ALL' ? 'New requests appear here the moment a customer submits one.' : 'Try another filter to see more.')
    : '';
}

function selectOrder(id, { scroll = false } = {}) {
  state.selectedId = state.selectedId === id && !scroll ? null : id;
  const o = visibleOrders().find((x) => x.id === state.selectedId);
  $$('.rcard', listEl).forEach((c) => c.classList.toggle('selected', Number(c.dataset.id) === state.selectedId));
  syncPins();
  if (o) {
    drawRoute([o.pickup_lat, o.pickup_lng]);
    fitPoints(map, [[state.loc.lat, state.loc.lng], [o.pickup_lat, o.pickup_lng]], { padding: [90, 90], maxZoom: 15 });
    if (scroll) listEl.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else drawRoute(null);
}

listEl.addEventListener('click', async (e) => {
  const acc = e.target.closest('[data-accept]');
  if (acc) return accept(Number(acc.dataset.accept), acc);
  const card = e.target.closest('.rcard');
  if (card) selectOrder(Number(card.dataset.id));
});
listEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('rcard')) selectOrder(Number(e.target.dataset.id)); });
listEl.addEventListener('mouseover', (e) => { const c = e.target.closest('.rcard'); if (c) pins.get(Number(c.dataset.id))?.getElement()?.querySelector('.pin')?.classList.add('is-active'); });
listEl.addEventListener('mouseout', (e) => { const c = e.target.closest('.rcard'); if (c && Number(c.dataset.id) !== state.selectedId) pins.get(Number(c.dataset.id))?.getElement()?.querySelector('.pin')?.classList.remove('is-active'); });

async function accept(id, btn) {
  const res = await run(btn, () => api.acceptOrder(id)); // errors (e.g. "Another rider just accepted this order") are toasted
  if (!res) return poller.refresh();                    // resync: a lost race removes the card with an exit animation
  toast(`Order #${id} accepted`, { kind: 'success', body: 'Head to the pickup point. The customer has been notified.' });
  state.active = res;
  state.open = state.open.filter((o) => o.id !== id);
  state.selectedId = null;
  render(true);
  poller.refresh();
}

/* ---------------------------------------------------------------- active mode */
const A = { top: $('#active-top'), order: $('#a-pane-order'), chatHost: $('#a-chat') };
let chat = null, chatOrderId = null, activeSig = '', aTab = 'order';
const aTabs = initSeg($('#a-tabs'), (v) => switchTab(v));
function switchTab(v) {
  aTab = v;
  $('#a-pane-order').classList.toggle('hidden', v !== 'order');
  $('#a-pane-chat').classList.toggle('hidden', v !== 'chat');
  chat?.setVisible(v === 'chat');
  if (v === 'chat') chat?.focus();
}
function teardownChat() { chat?.destroy(); chat = null; chatOrderId = null; activeSig = ''; aTabs.set('order', true); switchTab('order'); }

const RIDER_LABELS = { PENDING: 'Pending', ACCEPTED: 'Accepted', PICKED_UP: 'Picked up', IN_TRANSIT: 'On the way', DELIVERED: 'Delivered' };
const navUrl = (o) => o.status === 'ACCEPTED'
  ? `https://www.google.com/maps/dir/?api=1&destination=${o.pickup_lat},${o.pickup_lng}`
  : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(o.delivery_address + ', Karachi')}`;

function renderActive() {
  const o = state.active;
  if (!o) return;
  const toPickup = haversineDistance(state.loc.lat, state.loc.lng, o.pickup_lat, o.pickup_lng);
  const sig = JSON.stringify([o.id, o.status, o.priority, Math.round(toPickup * 10)]);
  if (sig === activeSig) return;
  activeSig = sig;

  const heading = o.status === 'ACCEPTED';
  A.top.innerHTML = `
    <div class="act-head">
      <h2><span class="mono" style="font-size:15px;color:var(--text-2);font-weight:500">Order</span> #${o.id}</h2>
      <div style="display:flex;gap:8px">${priorityBadge(o.priority)}${statusBadge(o.status)}</div>
    </div>`;

  A.order.innerHTML = `
    <div class="active-top">
      <div class="wayfind">
        <div class="wf-label">${heading ? 'Head to pickup' : 'Deliver to'}</div>
        <div class="wf-main">${esc(heading ? o.pickup_address : o.delivery_address)}</div>
        <div class="wf-sub">${heading ? `${icon('navigation', 'sm')} ${formatKm(toPickup)} from you` : `${icon('flag', 'sm')} Customer: ${esc(o.user_name)}`}</div>
        ${heading ? `<div class="wf-next">${icon('arrowR', 'sm')}<span>Then deliver to <b>${esc(o.delivery_address)}</b></span></div>` : ''}
        <div class="wf-actions"><a class="btn btn-sm" href="${navUrl(o)}" target="_blank" rel="noopener">${icon('externalLink', 'sm')} Open in Maps</a></div>
      </div>

      <div class="card card-pad">${stepperHtml(o.status, RIDER_LABELS)}</div>

      ${NEXT_STATUS[o.status] ? `<button class="btn btn-primary btn-lg btn-block next-btn" id="next-btn" data-status="${NEXT_STATUS[o.status]}">${icon(o.status === 'IN_TRANSIT' ? 'checkCircle' : 'arrowR')} ${NEXT_ACTION[o.status]}</button>` : ''}

      <div class="cust-card">${avatar(o.user_name, 'lg')}<div class="who"><strong>${esc(o.user_name)}</strong><span>Customer</span></div>
        <button class="btn btn-soft btn-sm" id="to-chat">${icon('chat', 'sm')} Chat</button></div>
      <div class="kv-card"><dl class="kv"><dt>Package</dt><dd>${esc(o.description || '-')}</dd><dt>Pickup</dt><dd>${esc(o.pickup_address)}</dd><dt>Drop-off</dt><dd>${esc(o.delivery_address)}</dd></dl></div>
      ${heading ? `<button class="btn btn-ghost btn-sm demo-btn" id="sim-btn" title="Demo helper: drives your marker to the pickup point so the customer sees live tracking">${icon('bike', 'sm')} Demo: simulate ride to pickup</button>` : ''}
    </div>`;
  $('#to-chat').onclick = () => aTabs.set('chat');

  if (chatOrderId !== o.id) {
    chat?.destroy();
    chatOrderId = o.id;
    chat = mountChat(A.chatHost, { orderId: o.id, me, live, quick: true, peerName: o.user_name.split(' ')[0], onUnread: (n) => { $('#a-chat-dot').innerHTML = n && aTab !== 'chat' ? '<i class="tab-dot"></i>' : ''; } });
    chat.setVisible(aTab === 'chat');
  }
}

A.order.addEventListener('click', async (e) => {
  const btn = e.target.closest('#next-btn');
  if (btn) {
    const status = btn.dataset.status;
    const res = await run(btn, () => api.setStatus(state.active.id, status));
    if (!res) return;
    if (status === 'DELIVERED') return celebrate(res);
    state.active = res; activeSig = ''; renderActive();
    toast(`Marked as ${STATUS_LABEL[status].toLowerCase()}`, { kind: 'success' });
    drawRoute(null);
    poller.refresh();
    return;
  }
  if (e.target.closest('#sim-btn')) simulateRide(e.target.closest('#sim-btn'));
});

function celebrate(order) {
  const ov = document.createElement('div');
  ov.className = 'success-overlay';
  ov.innerHTML = `<div class="success-card">
    <svg class="big-check" viewBox="0 0 84 84"><circle cx="42" cy="42" r="40"/><path d="M25 43l12 12 23-25"/></svg>
    <h2>Delivered!</h2><p class="muted">Order #${order.id} for ${esc(order.user_name)} is complete.<br/>You are available for the next request.</p>
    <button class="btn btn-primary" id="ok-btn">Back to requests</button></div>`;
  document.body.appendChild(ov);
  const done = () => {
    ov.style.animation = 'fade-out .3s both'; setTimeout(() => ov.remove(), 280);
    state.active = null; teardownChat(); render(true); poller.refresh();
  };
  ov.querySelector('#ok-btn').addEventListener('click', done);
  setTimeout(() => { if (ov.isConnected) done(); }, 3600);
}

let simming = false;
async function simulateRide(btn) {
  if (simming || !state.active) return;
  simming = true; btn.disabled = true;
  const o = state.active;
  const from = { ...state.loc };
  const steps = 10;
  for (let i = 1; i <= steps && state.active?.id === o.id && state.active.status === 'ACCEPTED'; i++) {
    const k = i / steps;
    await setLocationQuiet(from.lat + (o.pickup_lat - from.lat) * k, from.lng + (o.pickup_lng - from.lng) * k);
    await new Promise((r) => setTimeout(r, 1000));
  }
  simming = false; btn.disabled = false;
  toast('You have arrived at the pickup point', { kind: 'success' });
}
async function setLocationQuiet(lat, lng) {
  state.loc = { lat, lng }; locHoldUntil = Date.now() + 6000;
  animateMarker(youMarker, [lat, lng], 900); paintLocation(); activeSig = ''; renderActive();
  drawRoute([state.active.pickup_lat, state.active.pickup_lng]);
  try { await api.setLocation(+lat.toFixed(6), +lng.toFixed(6)); } catch { /* next step retries */ }
}
