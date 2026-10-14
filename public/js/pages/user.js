import { api } from '/js/lib/api.js';
import { requireRole } from '/js/lib/session.js';
import { mountTopbar } from '/js/lib/shell.js';
import { icon } from '/js/lib/icons.js';
import { poll, connect } from '/js/lib/live.js';
import { reconcile } from '/js/lib/list.js';
import { createMap, pinIcon, riderIcon, animateMarker, fitPoints, KARACHI } from '/js/lib/map.js';
import { haversineDistance } from '/js/lib/haversine.js';
import { mountChat } from '/js/lib/chat.js';
import { routeHtml, progressHtml, stepperHtml, timelineHtml } from '/js/lib/orderView.js';
import {
  $, $$, esc, greeting, avatar, statusBadge, priorityBadge, timeAgo, stamp, formatKm, toast, run, countUp, initSeg,
  openDrawer, emptyState, ACTIVE_STATUSES, STATUS_LABEL,
} from '/js/lib/ui.js';

const session = requireRole('user');
const me = { role: 'user', id: session.user.id };
mountTopbar($('#topbar'), session);
$('#greet').textContent = `${greeting()}, ${session.user.name.split(' ')[0]}`;
$('#req-icon').innerHTML = icon('package');
$('#pickup-icon').outerHTML = icon('pin');
$('#delivery-icon').outerHTML = icon('flag');
$('#locate').innerHTML = icon('locate');
$('#foot-icon').outerHTML = icon('info', 'sm');

let orders = [];
let loaded = false;
let filter = 'all';
let drawerCtl = null;

/* ============================================================= live data */
const live = connect(session.token, (ev, p) => {
  if (['order:accepted', 'order:status_updated', 'order:priority_changed'].includes(ev)) poller.refresh();
});
const poller = poll(async () => {
  const next = await api.myOrders();
  announceChanges(orders, next);
  orders = next;
  loaded = true;
  renderOrders();
  drawerCtl?.update(orders.find((o) => o.id === drawerCtl.id));
}, 4000);

// Toast on state changes that happened while the user was looking at the page.
function announceChanges(prev, next) {
  if (!loaded) return;
  const before = new Map(prev.map((o) => [o.id, o]));
  for (const o of next) {
    const p = before.get(o.id);
    if (!p) continue;
    if (!p.rider && o.rider) toast(`${o.rider.name} accepted your order`, { kind: 'success', body: `#${o.id} · they are heading to the pickup point.` });
    else if (p.status !== o.status && o.status !== 'ACCEPTED') {
      toast(`Order #${o.id} is ${STATUS_LABEL[o.status].toLowerCase()}`, { kind: o.status === 'DELIVERED' ? 'success' : 'info' });
    }
  }
}

/* ============================================================= orders list */
const listEl = $('#orders');
const filterSeg = initSeg($('#filter'), (v) => { filter = v; renderOrders(); });

function orderCardHtml(o) {
  return `
    <div class="oc-top">
      <div class="oc-id"><span class="mono">#${o.id}</span>${o.priority !== 'NORMAL' ? priorityBadge(o.priority) : ''}</div>
      ${statusBadge(o.status)}
    </div>
    ${routeHtml(o)}
    <div class="oc-desc">${icon('package', 'sm')}<span class="truncate">${esc(o.description || 'No package details')}</span></div>
    ${progressHtml(o.status)}
    <div class="oc-foot">
      ${o.rider
        ? `<span class="oc-rider">${avatar(o.rider.name, 'sm')}<span class="truncate">${esc(o.rider.name)}</span></span>`
        : `<span class="oc-wait"><i></i>Waiting for a rider</span>`}
      <span style="display:flex;align-items:center;gap:14px"><span>${timeAgo(o.created_at)}</span><span class="oc-go">Track ${icon('arrowR', 'sm')}</span></span>
    </div>`;
}

function renderOrders() {
  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const done = orders.filter((o) => o.status === 'DELIVERED');
  countUp($('#c-all'), orders.length, { duration: 400 });
  countUp($('#c-active'), active.length, { duration: 400 });
  countUp($('#c-done'), done.length, { duration: 400 });
  filterSeg.place();

  $('#head-stats').innerHTML = [
    ['truck', 'Active', active.length, 'var(--st-ACCEPTED-fg)', 'var(--st-ACCEPTED-bg)'],
    ['checkCircle', 'Delivered', done.length, 'var(--st-DELIVERED-fg)', 'var(--st-DELIVERED-bg)'],
    ['package', 'Total orders', orders.length, 'var(--accent-text)', 'var(--accent-soft)'],
  ].map(([ic, l, n, tone, soft]) => `<div class="mini-stat" style="--tone:${tone};--tone-soft:${soft}"><span class="icon-bubble">${icon(ic)}</span><div><b>${n}</b><span>${l}</span></div></div>`).join('');

  const shown = filter === 'active' ? active : filter === 'done' ? done : orders;
  if (loaded) listEl.querySelectorAll('.skeleton').forEach((s) => s.remove());
  reconcile(listEl, shown, {
    key: (o) => o.id,
    tag: 'article',
    className: 'order-card',
    render: orderCardHtml,
    attrs: (el, o) => {
      for (const p of ['HIGH', 'URGENT']) el.classList.toggle(`prio-${p}`, o.priority === p);
      el.dataset.open = o.id; el.tabIndex = 0; el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Order ${o.id}, ${STATUS_LABEL[o.status]}`);
    },
  });

  $('#orders-empty').innerHTML = loaded && !shown.length
    ? emptyState(filter === 'done' ? 'checkCircle' : 'inbox',
      orders.length ? `No ${filter === 'done' ? 'completed' : 'active'} orders` : 'No deliveries yet',
      orders.length ? 'Orders will show up here as they progress.' : 'Create your first request and a nearby rider will pick it up in minutes.')
    : '';
}

listEl.addEventListener('click', (e) => { const c = e.target.closest('[data-open]'); if (c) openOrder(Number(c.dataset.open)); });
listEl.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.open) { e.preventDefault(); openOrder(Number(e.target.dataset.open)); } });

/* ============================================================= request form */
const f = { pickup: $('#pickup'), delivery: $('#delivery'), desc: $('#desc'), form: $('#req-form'), submit: $('#req-submit'), combo: $('#combo'), list: $('#combo-list') };
let locations = [];
let pickup = null; // { name, lat, lng }
const fieldErr = (id, msg) => { const el = $(id); el.classList.toggle('has-error', !!msg); el.querySelector('.error-text').textContent = msg || ''; };

const pm = createMap($('#pick-map'), { center: KARACHI, zoom: 11, zoomControl: false });
let pickMarker = null;
function setPickup(p, { fly = true } = {}) {
  pickup = p;
  f.pickup.value = p.name;
  fieldErr('#f-pickup', '');
  if (!pickMarker) pickMarker = L.marker([p.lat, p.lng], { icon: pinIcon({ label: 'A' }), interactive: false }).addTo(pm.map);
  else animateMarker(pickMarker, [p.lat, p.lng], 400);
  if (fly) pm.map.flyTo([p.lat, p.lng], 14, { duration: 0.8 });
}
pm.map.on('click', (e) => {
  const lat = +e.latlng.lat.toFixed(5), lng = +e.latlng.lng.toFixed(5);
  setPickup({ name: `Dropped pin (${lat}, ${lng})`, lat, lng }, { fly: false });
  closeList();
});

api.locations().then((l) => { locations = l; renderList(''); }).catch(() => {});

let activeIdx = -1;
function renderList(q) {
  const term = q.trim().toLowerCase();
  const rows = locations.filter((l) => !term || l.name.toLowerCase().includes(term) || l.area.toLowerCase().includes(term));
  f.list.innerHTML = rows.length
    ? rows.map((l, i) => `<li role="option" data-i="${locations.indexOf(l)}" class="${i === activeIdx ? 'active' : ''}">${icon('pin')}<span class="t"><span>${esc(l.name)}</span><small>${esc(l.area)}</small></span></li>`).join('')
    : `<li class="none">No match. Tap the map to drop a pin.</li>`;
}
const openList = () => { f.list.classList.remove('hidden'); f.pickup.setAttribute('aria-expanded', 'true'); };
function closeList() { f.list.classList.add('hidden'); f.pickup.setAttribute('aria-expanded', 'false'); activeIdx = -1; }
f.pickup.addEventListener('focus', () => { f.pickup.select(); renderList(pickup && f.pickup.value === pickup.name ? '' : f.pickup.value); openList(); });
f.pickup.addEventListener('input', () => { pickup = null; activeIdx = -1; fieldErr('#f-pickup', ''); renderList(f.pickup.value); openList(); });
f.pickup.addEventListener('keydown', (e) => {
  const items = $$('li[data-i]', f.list);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); openList();
    activeIdx = (activeIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(items.length, 1);
    items.forEach((li, i) => li.classList.toggle('active', i === activeIdx));
    items[activeIdx]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && activeIdx >= 0) {
    e.preventDefault(); const l = locations[items[activeIdx].dataset.i]; setPickup(l); closeList();
  } else if (e.key === 'Escape') closeList();
});
f.list.addEventListener('mousedown', (e) => {
  const li = e.target.closest('li[data-i]'); if (!li) return;
  e.preventDefault(); setPickup(locations[li.dataset.i]); closeList(); f.delivery.focus();
});
document.addEventListener('click', (e) => { if (!f.combo.contains(e.target)) closeList(); });

$('#locate').addEventListener('click', (e) => {
  const btn = e.currentTarget;
  if (!navigator.geolocation) return toast('Location is not available in this browser', { kind: 'error' });
  btn.classList.add('is-loading');
  navigator.geolocation.getCurrentPosition(
    (pos) => { btn.classList.remove('is-loading'); setPickup({ name: 'My current location', lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) }); closeList(); },
    () => { btn.classList.remove('is-loading'); toast('Could not get your location', { kind: 'error', body: 'Allow location access, or pick a place from the list.' }); },
    { enableHighAccuracy: true, timeout: 8000 },
  );
});

f.desc.addEventListener('input', () => { $('#count').textContent = f.desc.value.length; fieldErr('#f-desc', ''); });
f.delivery.addEventListener('input', () => fieldErr('#f-delivery', ''));

f.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  let bad = false;
  if (!pickup) { fieldErr('#f-pickup', 'Choose a pickup point from the list or tap the map.'); bad = true; }
  if (f.delivery.value.trim().length < 5) { fieldErr('#f-delivery', 'Enter the delivery address (at least 5 characters).'); bad = true; }
  if (f.desc.value.trim().length < 3) { fieldErr('#f-desc', 'Tell the rider what they are carrying.'); bad = true; }
  if (bad) { f.form.classList.remove('shake'); void f.form.offsetWidth; f.form.classList.add('shake'); return; }

  const order = await run(f.submit, () => api.createOrder({
    pickup_address: pickup.name, pickup_lat: pickup.lat, pickup_lng: pickup.lng,
    delivery_address: f.delivery.value.trim(), description: f.desc.value.trim(),
  }));
  if (!order) return;
  // success micro-interaction
  f.submit.classList.add('btn-success');
  $('#req-label').innerHTML = `${icon('check')} Request sent`;
  toast(`Order #${order.id} created`, { kind: 'success', body: 'Nearby riders have been notified.' });
  f.delivery.value = ''; f.desc.value = ''; $('#count').textContent = '0';
  filterSeg.set('all');
  orders = [order, ...orders.filter((o) => o.id !== order.id)];
  renderOrders();
  setTimeout(() => { f.submit.classList.remove('btn-success'); $('#req-label').textContent = 'Request delivery'; }, 1800);
  poller.refresh();
});

/* ============================================================= order drawer */
function openOrder(id) {
  const seed = orders.find((o) => o.id === id);
  if (!seed) return;
  let order = seed;
  let chat = null;
  let tab = 'details';
  let map = null, pickM = null, riderM = null, chipEl = null;
  let history = [];
  let lastSig = '';
  let timer = null;

  const body = document.createElement('div');
  body.innerHTML = `
    <div class="map-card"><div class="map" id="d-map"></div><div class="map-chip" id="d-chip"></div></div>
    <div class="detail-tabs">
      <div class="seg" id="d-tabs">
        <button data-value="details" aria-selected="true">Details</button>
        <button data-value="chat" aria-selected="false" id="tab-chat">Chat <span id="chat-dot"></span></button>
      </div>
    </div>
    <div id="pane-details" class="tab-pane"></div>
    <div id="pane-chat" class="tab-pane hidden"></div>`;

  const dr = openDrawer({
    title: `<span class="mono" style="font-weight:500;color:var(--text-2)">Order</span> #${id} <span id="d-status"></span>`,
    subtitle: `Requested ${stamp(seed.created_at)}`,
    body,
    onClose: () => { clearInterval(timer); chat?.destroy(); map?.destroy(); drawerCtl = null; },
  });
  dr.el.classList.add('order-drawer');

  map = createMap($('#d-map', body), { center: [seed.pickup_lat, seed.pickup_lng], zoom: 14, zoomControl: true });
  pickM = L.marker([seed.pickup_lat, seed.pickup_lng], { icon: pinIcon({ label: 'A' }), interactive: false }).addTo(map.map);
  chipEl = $('#d-chip', body);

  const tabs = initSeg($('#d-tabs', body), (v) => switchTab(v));
  function switchTab(v) {
    if (v === 'chat' && !order.rider) { tabs.set('details', true); toast('Chat opens once a rider accepts', { kind: 'info' }); return; }
    tab = v;
    $('#pane-details', body).classList.toggle('hidden', v !== 'details');
    $('#pane-chat', body).classList.toggle('hidden', v !== 'chat');
    chat?.setVisible(v === 'chat');
    if (v === 'chat') chat?.focus();
  }

  function ensureChat() {
    if (chat || !order.rider) return;
    $('#pane-chat', body).innerHTML = `<div class="chat-host"></div>`;
    chat = mountChat($('.chat-host', body), {
      orderId: id, me, live, peerName: order.rider.name,
      onUnread: (n) => { $('#chat-dot', body).innerHTML = n && tab !== 'chat' ? '<i class="tab-dot"></i>' : ''; },
    });
    chat.setVisible(tab === 'chat');
  }

  async function paint(o) {
    order = o;
    dr.setTitle(`<span class="mono" style="font-weight:500;color:var(--text-2)">Order</span> #${id} ${statusBadge(o.status)}${o.priority !== 'NORMAL' ? priorityBadge(o.priority) : ''}`);
    const sig = JSON.stringify([o.status, o.rider_id, o.priority, history.length]);
    if (sig !== lastSig) {
      lastSig = sig;
      $('#pane-details', body).innerHTML = `
        <div class="block">${stepperHtml(o.status)}</div>
        <div class="block">
          <div class="block-title">Your rider</div>
          ${o.rider
            ? `<div class="person-card">${avatar(o.rider.name, 'lg')}<div class="who"><strong>${esc(o.rider.name)}</strong><span>${o.status === 'DELIVERED' ? 'Delivered your order' : 'Delivering your order'}</span></div>
               <button class="btn btn-soft btn-sm" id="open-chat">${icon('chat', 'sm')} Message</button></div>`
            : `<div class="wait-card"><div class="radar"><i></i><i></i><i></i><span class="core">${icon('bike')}</span></div>
               <div><strong>Finding the nearest rider…</strong><span>Riders nearby can see your request right now. This usually takes a few minutes.</span></div></div>`}
        </div>
        <div class="block">
          <div class="block-title">Route &amp; package</div>
          ${routeHtml(o)}
          <hr class="divider" />
          <dl class="kv"><dt>Package</dt><dd>${esc(o.description || '-')}</dd><dt>Priority</dt><dd>${priorityBadge(o.priority)}</dd><dt>Requested</dt><dd>${stamp(o.created_at)}</dd></dl>
        </div>
        <div class="block"><div class="block-title">Timeline</div>${timelineHtml(history, o.status)}</div>`;
      $('#open-chat', body)?.addEventListener('click', () => { tabs.set('chat'); });
      ensureChat();
    }
    // live map: pickup + (rider while the delivery is in progress)
    const tracking = o.rider && o.rider_lat != null && o.status !== 'DELIVERED';
    if (tracking) {
      const pos = [o.rider_lat, o.rider_lng];
      if (!riderM) { riderM = L.marker(pos, { icon: riderIcon(), interactive: false, zIndexOffset: 800 }).addTo(map.map); fitPoints(map.map, [pos, [o.pickup_lat, o.pickup_lng]], { padding: [60, 60] }); }
      else animateMarker(riderM, pos, 1100);
      const km = haversineDistance(o.rider_lat, o.rider_lng, o.pickup_lat, o.pickup_lng);
      chipEl.innerHTML = `<span class="live-dot"></span>${o.status === 'ACCEPTED' ? `${esc(o.rider.name.split(' ')[0])} is ${formatKm(km)} from pickup` : `${esc(o.rider.name.split(' ')[0])} is on the way`}`;
      chipEl.classList.remove('hidden');
    } else {
      if (riderM) { riderM.remove(); riderM = null; }
      chipEl.innerHTML = o.status === 'DELIVERED' ? `${icon('checkCircle', 'sm')} Delivered` : `${icon('pin', 'sm')} Pickup point`;
    }
  }

  async function loadHistory() {
    try {
      const full = await api.order(id);
      history = full.statusHistory || [];
      await paint({ ...order, ...full });
    } catch { /* keep last state */ }
  }

  drawerCtl = {
    id,
    update: (o) => {
      if (!o) return;
      const statusChanged = o.status !== order.status;
      paint({ ...order, ...o });
      if (statusChanged) loadHistory();
    },
  };
  paint(seed).then(loadHistory);
  timer = setInterval(loadHistory, 5000); // history also arrives with every status change; this is the safety net
}
