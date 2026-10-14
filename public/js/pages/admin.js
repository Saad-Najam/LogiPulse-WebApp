import { api } from '/js/lib/api.js';
import { requireRole } from '/js/lib/session.js';
import { mountTopbar } from '/js/lib/shell.js';
import { icon } from '/js/lib/icons.js';
import { poll, connect } from '/js/lib/live.js';
import { reconcile } from '/js/lib/list.js';
import { createMap, pinIcon, fitPoints, KARACHI } from '/js/lib/map.js';
import { routeHtml, timelineHtml } from '/js/lib/orderView.js';
import {
  $, $$, esc, avatar, statusBadge, priorityBadge, timeAgo, stamp, toast, countUp, debounce, openDrawer, emptyState,
  PRIORITIES, PRIORITY_LABEL, STATUS_LABEL,
} from '/js/lib/ui.js';

const session = requireRole('admin');
mountTopbar($('#topbar'), session);
$$('[data-i]').forEach((el) => { el.outerHTML = el.classList.contains('icon-bubble') ? `<span class="icon-bubble">${icon(el.dataset.i)}</span>` : icon(el.dataset.i); });
$('#o-prev').innerHTML = `${icon('chevL', 'sm')} Previous`;
$('#o-next').innerHTML = `Next ${icon('chevR', 'sm')}`;

/* ============================================================ state */
const S = {
  route: 'overview',
  stats: null, prio: null, riders: [], allOrders: [], users: [],
  orders: { orders: [], total: 0, page: 1, pages: 1 },
  expandedOrders: new Set(), orderDetail: new Map(), expandedRiders: new Set(), riderDetail: new Map(),
  filters: { q: '', status: '', priority: '' }, onlyAvailable: false, userQ: '',
  syncedAt: null,
};
const ROUTES = ['overview', 'orders', 'riders', 'users', 'priority'];

/* ============================================================ routing */
function setRoute(r) {
  S.route = ROUTES.includes(r) ? r : 'overview';
  $$('.route-sec').forEach((s) => s.classList.toggle('hidden', s.id !== `sec-${S.route}`));
  $$('.nav-item').forEach((a) => a.classList.toggle('active', a.dataset.route === S.route));
  if (S.route === 'overview') requestAnimationFrame(() => { fleet.map.invalidateSize(); fitFleet(); });
  poller.refresh();
}
window.addEventListener('hashchange', () => setRoute(location.hash.slice(1)));

/* ============================================================ data */
const live = connect(session.token, () => poller.refresh());
const poller = poll(async () => {
  // Always-on: counters for the sidebar, stats tiles and priority analytics.
  const base = await Promise.all([api.stats(), api.priorityAnalytics()]);
  [S.stats, S.prio] = base;
  S.syncedAt = Date.now();

  const jobs = [];
  if (S.route === 'overview') jobs.push(Promise.all([api.riders(), api.allOrders({ limit: 100 })]).then(([r, o]) => { S.riders = r; S.allOrders = o.orders; }));
  if (S.route === 'orders') jobs.push(loadOrders());
  if (S.route === 'riders') jobs.push(api.riders().then((r) => { S.riders = r; }).then(loadRiderDetails));
  if (S.route === 'users') jobs.push(api.users().then((u) => { S.users = u; }));
  if (S.route === 'priority') jobs.push(api.allOrders({ limit: 100 }).then((o) => { S.allOrders = o.orders; }));
  await Promise.all(jobs);
  renderAll();
}, 4000);

async function loadOrders() {
  const { q, status, priority } = S.filters;
  S.orders = await api.allOrders({ page: S.orders.page, limit: 25, q, status, priority });
  if (S.orders.page > S.orders.pages) { S.orders.page = S.orders.pages; return loadOrders(); }
  await Promise.all([...S.expandedOrders].map(async (id) => { try { S.orderDetail.set(id, await api.order(id)); } catch { /* ignore */ } }));
}
async function loadRiderDetails() {
  await Promise.all([...S.expandedRiders].map(async (id) => { try { S.riderDetail.set(id, await api.rider(id)); } catch { /* ignore */ } }));
}

/* ============================================================ render dispatcher */
function renderAll() {
  renderNav();
  renderSync();
  if (S.route === 'overview') renderOverview();
  if (S.route === 'orders') renderOrders();
  if (S.route === 'riders') renderRiders();
  if (S.route === 'users') renderUsers();
  if (S.route === 'priority') renderPriority();
}

function renderNav() {
  const s = S.stats; if (!s) return;
  $('#nav-orders').textContent = s.total_orders;
  $('#nav-riders').textContent = s.total_riders;
  $('#nav-users').textContent = s.total_users;
  const u = S.prio?.urgent ?? 0;
  const el = $('#nav-urgent');
  el.textContent = u; el.classList.toggle('hidden', u === 0);
}
let syncTimer;
function renderSync() {
  clearInterval(syncTimer);
  const paint = () => { $('#sync-text').textContent = S.syncedAt ? `Updated ${Math.max(0, Math.round((Date.now() - S.syncedAt) / 1000))}s ago` : 'Syncing…'; };
  paint(); syncTimer = setInterval(paint, 1000);
}

/* ============================================================ OVERVIEW */
const statGrid = $('#stat-grid');
function renderOverview() {
  const s = S.stats; if (!s) return;
  const tiles = [
    ['Total orders', s.total_orders, 'package', 'var(--accent-text)', 'var(--accent-soft)', `${s.active_orders} in progress`],
    ['Active riders', s.active_riders, 'bike', 'var(--success-text)', 'var(--success-soft)', `${s.busy_riders} busy · ${s.total_riders} total`],
    ['Pending orders', s.pending_orders, 'clock', 'var(--warning-text)', 'var(--warning-soft)', 'Waiting for a rider'],
    ['Delivered today', s.delivered_today, 'checkCircle', 'var(--st-ACCEPTED-fg)', 'var(--st-ACCEPTED-bg)', `${s.delivered_orders} delivered overall`],
  ];
  if (!statGrid.children.length) {
    statGrid.innerHTML = tiles.map(([l, , ic, tone, soft], i) => `<div class="card stat" style="--i:${i};--tone:${tone};--tone-soft:${soft}">
      <div class="label-row"><span>${l}</span><span class="icon-bubble">${icon(ic)}</span></div><div class="value" data-v="0">0</div><div class="sub"></div></div>`).join('');
  }
  [...statGrid.children].forEach((card, i) => { countUp($('.value', card), tiles[i][1]); $('.sub', card).textContent = tiles[i][5]; });

  renderBars(s.ordersPerHour);
  renderPrioMix();
  renderFleet();
  renderRecent();
}

let barsBuilt = false;
function renderBars(data) {
  const el = $('#bars');
  const max = Math.max(4, ...data.map((d) => d.count));
  if (!barsBuilt) {
    el.innerHTML = data.map((d, i) => `<div class="bar-col ${i === data.length - 1 ? 'now' : ''}" title="${d.count} orders">
      <div class="bar-track"><span class="bar-val">${d.count}</span><div class="bar" style="--h:0%"></div></div>
      <span class="bar-label">${new Date(d.hour).toLocaleTimeString([], { hour: 'numeric' })}</span></div>`).join('');
    barsBuilt = true;
    requestAnimationFrame(() => requestAnimationFrame(() => applyBars(data, max)));
  } else applyBars(data, max);
}
function applyBars(data, max) {
  [...$('#bars').children].forEach((col, i) => {
    const h = `${(data[i].count / max) * 100}%`;
    $('.bar', col).style.setProperty('--h', h);
    $('.bar-val', col).style.setProperty('--h', h);
    $('.bar-val', col).textContent = data[i].count;
    col.title = `${data[i].count} orders`;
  });
}

function prioCounts() { return S.prio ?? { normal: 0, high: 0, urgent: 0 }; }
function renderPrioMix() {
  const c = prioCounts(); const total = Math.max(1, c.normal + c.high + c.urgent);
  const rows = [['URGENT', c.urgent, 'var(--pr-URGENT-line)'], ['HIGH', c.high, 'var(--pr-HIGH-line)'], ['NORMAL', c.normal, 'var(--text-3)']];
  const host = $('#ov-priority');
  if (!host.children.length) host.innerHTML = `<div class="prio-row">${rows.map(([p, , col]) => `<div class="prio-line" data-p="${p}"><span style="min-width:70px">${priorityBadge(p)}</span><div class="meter" style="--c:${col}"><i></i></div><b data-v="0">0</b></div>`).join('')}</div>
    <p class="muted" style="font-size:12.5px;margin-top:16px">Open orders only (delivered orders are excluded).</p>`;
  rows.forEach(([p, n]) => { const line = $(`[data-p="${p}"]`, host); $('.meter i', line).style.setProperty('--w', `${(n / total) * 100}%`); countUp($('b', line), n, { duration: 600 }); });
}

/* fleet map */
const fleet = createMap($('#fleet-map'), { center: KARACHI, zoom: 11, zoomControl: true });
const riderMarkers = new Map(); const orderMarkers = new Map();
let fitted = false;
function fitFleet() {
  const pts = [...riderMarkers.values(), ...orderMarkers.values()].map((m) => [m.getLatLng().lat, m.getLatLng().lng]);
  fitPoints(fleet.map, pts, { padding: [40, 40], maxZoom: 13 });
}
function renderFleet() {
  const free = S.riders.filter((r) => r.is_available).length;
  $('#ov-fleet-chip').textContent = `${free} available / ${S.riders.length - free} busy`;

  // markers (diffed)
  const rset = new Set(S.riders.map((r) => r.id));
  for (const [id, m] of riderMarkers) if (!rset.has(id)) { m.remove(); riderMarkers.delete(id); }
  for (const r of S.riders) {
    if (r.current_lat == null) continue;
    const cls = r.is_available ? 'free' : 'busy';
    const ic = L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="dot-marker ${cls}"></div>` });
    let m = riderMarkers.get(r.id);
    if (!m) { m = L.marker([r.current_lat, r.current_lng], { icon: ic, title: r.name }).bindTooltip(esc(r.name), { direction: 'top', offset: [0, -10] }).addTo(fleet.map); riderMarkers.set(r.id, m); }
    else { m.setLatLng([r.current_lat, r.current_lng]); m.setIcon(ic); }
  }
  const pending = S.allOrders.filter((o) => o.status === 'PENDING');
  const oset = new Set(pending.map((o) => o.id));
  for (const [id, m] of orderMarkers) if (!oset.has(id)) { m.remove(); orderMarkers.delete(id); }
  for (const o of pending) {
    const ic = pinIcon({ label: `#${o.id}`, priority: o.priority });
    let m = orderMarkers.get(o.id);
    if (!m) { m = L.marker([o.pickup_lat, o.pickup_lng], { icon: ic }).bindTooltip(`#${o.id} · ${esc(o.pickup_address)}`, { direction: 'top', offset: [0, -34] }).addTo(fleet.map); orderMarkers.set(o.id, m); }
    else m.setIcon(ic);
  }
  if (!fitted && (riderMarkers.size || orderMarkers.size)) { fitted = true; fitFleet(); }

  // rider status list
  const sorted = [...S.riders].sort((a, b) => Number(a.is_available) - Number(b.is_available) || a.name.localeCompare(b.name));
  $('#ov-riders').innerHTML = sorted.map((r, i) => `<div class="mini-row" style="--i:${i}">${avatar(r.name, 'sm')}
    <div class="grow"><strong>${esc(r.name)}</strong><small>${r.active_order_id ? `On order #${r.active_order_id}` : 'Waiting for requests'}</small></div>
    <span class="pdot ${r.is_available ? 'free' : 'busy'}" title="${r.is_available ? 'Available' : 'Busy'}"></span></div>`).join('') || emptyState('bike', 'No riders yet', 'Riders appear here once they register.');
}

function prioCell(o, editable) {
  if (!editable) return `<td>${priorityBadge(o.priority)}</td>`;
  return `<td><select class="select prio-select" data-prio="${o.id}" data-v="${o.priority}" aria-label="Priority for order ${o.id}">${PRIORITIES.map((p) => `<option value="${p}" ${p === o.priority ? 'selected' : ''}>${PRIORITY_LABEL[p]}</option>`).join('')}</select></td>`;
}
function orderRowHtml(o, { editable = false } = {}) {
  return `
    <td class="td-id">#${o.id}</td>
    <td><div class="cell-user">${avatar(o.user_name, 'sm')}<div class="who"><strong class="truncate">${esc(o.user_name)}</strong></div></div></td>
    <td><div class="cell-route"><span><i class="rd"></i><span class="truncate">${esc(o.pickup_address)}</span></span><span><i class="rd to"></i><span class="truncate muted">${esc(o.delivery_address)}</span></span></div></td>
    <td>${o.rider ? `<div class="cell-user">${avatar(o.rider.name, 'sm')}<strong class="truncate">${esc(o.rider.name)}</strong></div>` : '<span class="subtle">Unassigned</span>'}</td>
    <td>${statusBadge(o.status)}</td>
    ${prioCell(o, editable)}
    <td class="muted" title="${stamp(o.created_at)}">${timeAgo(o.created_at)}</td>`;
}
function renderRecent() {
  reconcile($('#ov-orders'), S.allOrders.slice(0, 6), {
    key: (o) => o.id, tag: 'tr', className: 'row',
    sig: (o) => `${o.status}|${o.priority}|${o.rider_id}`,
    render: (o) => orderRowHtml(o),
    attrs: (el, o) => { for (const p of ['HIGH', 'URGENT']) el.classList.toggle(`prio-row-${p}`, o.priority === p); },
  });
}

/* ============================================================ ORDERS */
function renderOrders() {
  const { orders: items, total, page, pages } = S.orders;
  $('#o-count').textContent = `${total} order${total === 1 ? '' : 's'}`;
  const rows = [];
  for (const o of items) {
    rows.push({ k: `r${o.id}`, o, type: 'row' });
    if (S.expandedOrders.has(o.id)) rows.push({ k: `d${o.id}`, o, type: 'detail' });
  }
  reconcile($('#o-body'), rows, {
    key: (x) => x.k, tag: 'tr',
    sig: (x) => x.type === 'row' ? `${x.o.status}|${x.o.priority}|${x.o.rider_id}|${S.expandedOrders.has(x.o.id)}`
      : `${x.o.status}|${x.o.priority}|${S.orderDetail.get(x.o.id)?.statusHistory?.length ?? -1}`,
    render: (x) => x.type === 'row'
      ? `${orderRowHtml(x.o, { editable: true })}<td style="text-align:right"><span class="chev">${icon('chevR', 'sm')}</span></td>`
      : detailHtml(x.o),
    attrs: (el, x) => {
      el.dataset.oid = x.o.id;
      if (x.type === 'row') {
        el.classList.add('row', 'clickable'); el.classList.toggle('open', S.expandedOrders.has(x.o.id));
        for (const p of ['HIGH', 'URGENT']) el.classList.toggle(`prio-row-${p}`, x.o.priority === p);
      } else el.classList.add('detail-row');
    },
  });
  $('#o-empty').innerHTML = !items.length ? emptyState('inbox', 'No orders match', 'Try clearing the search or filters.') : '';
  const from = total ? (page - 1) * 25 + 1 : 0;
  $('#o-range').textContent = total ? `Showing ${from}-${Math.min(page * 25, total)} of ${total}` : '';
  $('#o-prev').disabled = page <= 1; $('#o-next').disabled = page >= pages;
}
function detailHtml(o) {
  const d = S.orderDetail.get(o.id);
  return `<td colspan="8"><div class="detail-grid">
    <div><div class="block-title">Route &amp; package</div>${routeHtml(o)}<hr class="divider"/>
      <dl class="kv"><dt>Package</dt><dd>${esc(o.description || '-')}</dd><dt>Customer</dt><dd>${esc(o.user_name)}</dd><dt>Rider</dt><dd>${o.rider ? esc(o.rider.name) : 'Not assigned yet'}</dd><dt>Created</dt><dd>${stamp(o.created_at)}</dd></dl></div>
    <div><div class="block-title">Status history</div>${d ? timelineHtml(d.statusHistory, o.status) : '<div class="skeleton" style="height:140px"></div>'}</div>
  </div></td>`;
}

const ob = $('#o-body');
ob.addEventListener('click', async (e) => {
  if (e.target.closest('.prio-select')) return;
  const tr = e.target.closest('tr.row'); if (!tr) return;
  const id = Number(tr.dataset.oid);
  if (S.expandedOrders.has(id)) S.expandedOrders.delete(id);
  else { S.expandedOrders.add(id); try { S.orderDetail.set(id, await api.order(id)); } catch { /* ignore */ } }
  renderOrders();
});
ob.addEventListener('change', async (e) => {
  const sel = e.target.closest('.prio-select'); if (!sel) return;
  const id = Number(sel.dataset.prio); const prev = sel.dataset.v;
  sel.dataset.v = sel.value;
  try { await api.setPriority(id, sel.value); toast(`Order #${id} is now ${PRIORITY_LABEL[sel.value].toLowerCase()} priority`, { kind: 'success' }); poller.refresh(); }
  catch (err) { sel.value = prev; sel.dataset.v = prev; toast(err.message, { kind: 'error' }); }
});
$('#o-search').addEventListener('input', debounce((e) => { S.filters.q = e.target.value.trim(); S.orders.page = 1; poller.refresh(); }, 300));
$('#o-status').addEventListener('change', (e) => { S.filters.status = e.target.value; S.orders.page = 1; poller.refresh(); });
$('#o-priority').addEventListener('change', (e) => { S.filters.priority = e.target.value; S.orders.page = 1; poller.refresh(); });
$('#o-prev').addEventListener('click', () => { S.orders.page--; poller.refresh(); });
$('#o-next').addEventListener('click', () => { S.orders.page++; poller.refresh(); });

/* ============================================================ RIDERS */
function renderRiders() {
  const free = S.riders.filter((r) => r.is_available).length;
  $('#r-summary').textContent = `${free} available / ${S.riders.length - free} busy`;
  let list = [...S.riders].sort((a, b) => Number(a.is_available) - Number(b.is_available) || a.name.localeCompare(b.name));
  if (S.onlyAvailable) list = list.filter((r) => r.is_available);
  const rows = [];
  for (const r of list) { rows.push({ k: `r${r.id}`, r, type: 'row' }); if (S.expandedRiders.has(r.id)) rows.push({ k: `d${r.id}`, r, type: 'detail' }); }
  reconcile($('#r-body'), rows, {
    key: (x) => x.k, tag: 'tr',
    sig: (x) => x.type === 'row' ? JSON.stringify([x.r.is_available, x.r.active_order_id, x.r.current_lat, x.r.current_lng, x.r.delivery_count, S.expandedRiders.has(x.r.id), Math.floor(Date.now() / 60000)])
      : JSON.stringify([S.riderDetail.get(x.r.id)?.recentDeliveries?.map((d) => d.status)]),
    render: (x) => x.type === 'row' ? riderRowHtml(x.r) : riderDetailHtml(x.r),
    attrs: (el, x) => { el.dataset.rid = x.r.id; if (x.type === 'row') { el.classList.add('row', 'clickable'); el.classList.toggle('open', S.expandedRiders.has(x.r.id)); } else el.classList.add('detail-row'); },
  });
  $('#r-empty').innerHTML = !list.length ? emptyState('bike', S.onlyAvailable ? 'No riders are available' : 'No riders yet', S.onlyAvailable ? 'Everyone is busy or offline right now.' : 'Riders appear here once they register.') : '';
}
function riderRowHtml(r) {
  return `<td><div class="cell-user">${avatar(r.name, 'sm')}<div class="who"><strong>${esc(r.name)}</strong><small>${esc(r.email)}</small></div></div></td>
    <td><span class="status-cell"><span class="pdot ${r.is_available ? 'free' : 'busy'}"></span>${r.is_available ? 'Available' : 'Busy'}</span></td>
    <td>${r.active_order_id ? `<strong class="mono">#${r.active_order_id}</strong> <span class="muted truncate" style="max-width:180px;display:inline-block;vertical-align:bottom">${esc(r.active_pickup_address || '')}</span>` : '<span class="subtle">None</span>'}</td>
    <td class="mono" style="font-size:12.5px">${r.current_lat != null ? `${r.current_lat.toFixed(4)}, ${r.current_lng.toFixed(4)}` : '-'}</td>
    <td class="muted">${r.location_updated_at ? timeAgo(r.location_updated_at) : '-'}</td>
    <td><span class="chip">${r.delivery_count}</span></td>
    <td style="text-align:right"><span class="chev">${icon('chevR', 'sm')}</span></td>`;
}
function riderDetailHtml(r) {
  const d = S.riderDetail.get(r.id);
  const recent = d?.recentDeliveries ?? [];
  return `<td colspan="7"><div class="detail-grid">
    <div><div class="block-title">Profile</div><dl class="kv"><dt>Email</dt><dd>${esc(r.email)}</dd><dt>Position</dt><dd>${r.current_lat != null ? `${r.current_lat.toFixed(5)}, ${r.current_lng.toFixed(5)}` : '-'}</dd><dt>Map</dt><dd>${r.current_lat != null ? `<a href="https://www.google.com/maps?q=${r.current_lat},${r.current_lng}" target="_blank" rel="noopener">Open in Google Maps ${icon('externalLink', 'sm')}</a>` : '-'}</dd><dt>Member since</dt><dd>${stamp(r.created_at)}</dd></dl></div>
    <div><div class="block-title">Last 5 orders</div>${d ? (recent.length ? recent.map((o) => `<div class="mini-row" style="padding:8px 0"><span class="mono muted">#${o.id}</span><div class="grow"><strong class="truncate">${esc(o.pickup_address)}</strong><small class="truncate">to ${esc(o.delivery_address)}</small></div>${statusBadge(o.status)}</div>`).join('') : '<span class="muted">No deliveries yet.</span>') : '<div class="skeleton" style="height:90px"></div>'}</div>
  </div></td>`;
}
$('#r-body').addEventListener('click', async (e) => {
  const tr = e.target.closest('tr.row'); if (!tr) return;
  const id = Number(tr.dataset.rid);
  if (S.expandedRiders.has(id)) S.expandedRiders.delete(id);
  else { S.expandedRiders.add(id); try { S.riderDetail.set(id, await api.rider(id)); } catch { /* ignore */ } }
  renderRiders();
});
$('#r-only').addEventListener('change', (e) => { S.onlyAvailable = e.target.checked; renderRiders(); });

/* ============================================================ USERS */
function renderUsers() {
  const q = S.userQ.toLowerCase();
  const list = S.users.filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  $('#u-count').textContent = `${S.users.length} customer${S.users.length === 1 ? '' : 's'}`;
  reconcile($('#u-body'), list, {
    key: (u) => u.id, tag: 'tr', className: 'row clickable',
    sig: (u) => `${u.order_count}|${u.name}`,
    render: (u) => `<td><div class="cell-user">${avatar(u.name, 'sm')}<strong>${esc(u.name)}</strong></div></td><td class="muted">${esc(u.email)}</td>
      <td class="muted">${new Date(u.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</td>
      <td><span class="chip">${u.order_count}</span></td><td style="text-align:right"><span class="chev">${icon('chevR', 'sm')}</span></td>`,
    attrs: (el, u) => { el.dataset.uid = u.id; },
  });
  $('#u-empty').innerHTML = !list.length ? emptyState('users', 'No customers found', 'Try a different search.') : '';
}
$('#u-search').addEventListener('input', debounce((e) => { S.userQ = e.target.value.trim(); renderUsers(); }, 150));
$('#u-body').addEventListener('click', async (e) => {
  const tr = e.target.closest('tr[data-uid]'); if (!tr) return;
  const u = await api.user(Number(tr.dataset.uid)).catch((err) => { toast(err.message, { kind: 'error' }); return null; });
  if (!u) return;
  openDrawer({
    title: `${avatar(u.name, 'lg')}<span>${esc(u.name)}</span>`, subtitle: esc(u.email),
    body: `<div class="block"><div class="block-title">Account</div><dl class="kv"><dt>Customer ID</dt><dd class="mono">#${u.id}</dd><dt>Member since</dt><dd>${stamp(u.created_at)}</dd></dl></div>
      <div class="block"><div class="block-title">Recent orders</div>${u.recentOrders.length ? u.recentOrders.map((o) => `<div class="mini-row" style="padding:12px 0"><span class="mono muted">#${o.id}</span><div class="grow"><strong class="truncate">${esc(o.pickup_address)}</strong><small class="truncate">to ${esc(o.delivery_address)}</small></div>${statusBadge(o.status)}</div>`).join('') : '<span class="muted">No orders yet.</span>'}</div>`,
  });
});

/* ============================================================ PRIORITY */
function renderPriority() {
  const c = prioCounts(); const total = c.normal + c.high + c.urgent;
  const tiles = [['NORMAL', c.normal, 'Standard delivery'], ['HIGH', c.high, 'Time-sensitive'], ['URGENT', c.urgent, 'Critical, act now']];
  const host = $('#p-tiles');
  if (!host.children.length) host.innerHTML = tiles.map(([p, , sub]) => `<div class="prio-tile" data-p="${p}"><div class="pt-label">${priorityBadge(p)}</div><div class="pt-value" data-v="0">0</div><div class="pt-sub">${sub}</div></div>`).join('');
  tiles.forEach(([p, n]) => { const t = $(`[data-p="${p}"]`, host); countUp($('.pt-value', t), n); if (p === 'URGENT') t.classList.toggle('hot', n > 5); });

  $('#p-alert').innerHTML = c.urgent > 5
    ? `<div class="alert-banner">${icon('alert')}<span>${c.urgent} urgent orders are open. Consider assigning more riders to the busiest areas.</span></div>` : '';

  const seg = (cls, n, label) => (n ? `<span class="${cls}" style="--w:${(n / Math.max(total, 1)) * 100}%">${n > 0 && n / Math.max(total, 1) > 0.08 ? `${label} ${n}` : ''}</span>` : '');
  $('#p-bar').innerHTML = total ? `<div class="dist-bar">${seg('n', c.normal, 'Normal')}${seg('h', c.high, 'High')}${seg('u', c.urgent, 'Urgent')}</div>` : '<span class="muted">No open orders.</span>';

  const attn = S.allOrders.filter((o) => o.status === 'PENDING' && o.priority !== 'NORMAL').sort((a, b) => (b.priority === 'URGENT') - (a.priority === 'URGENT') || new Date(a.created_at) - new Date(b.created_at));
  $('#p-attn-count').textContent = attn.length;
  $('#p-attn').innerHTML = attn.length ? attn.map((o, i) => `<div class="mini-row" style="--i:${i}"><span class="mono muted">#${o.id}</span><div class="grow"><strong class="truncate">${esc(o.pickup_address)}</strong><small>waiting ${timeAgo(o.created_at).replace(' ago', '')} · ${esc(o.user_name)}</small></div>${priorityBadge(o.priority)}</div>`).join('')
    : emptyState('checkCircle', 'Nothing waiting', 'No high or urgent orders are waiting for a rider.');
  const esc2 = S.prio?.recentEscalations ?? [];
  $('#p-esc').innerHTML = esc2.length ? esc2.map((e, i) => `<div class="mini-row" style="--i:${i}"><span class="mono muted">#${e.orderId}</span><div class="grow"><strong>Changed to ${PRIORITY_LABEL[e.priority]}</strong><small>${timeAgo(e.changed_at)}</small></div>${priorityBadge(e.priority)}</div>`).join('')
    : emptyState('trend', 'No escalations yet', 'Priority changes made from the Orders table appear here.');
}

/* ============================================================ boot */
setRoute(location.hash.slice(1));
