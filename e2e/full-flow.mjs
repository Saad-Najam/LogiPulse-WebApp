// End-to-end: the PRD's standard demo, driven through the real UI in three tabs (customer / rider / admin).
// Asserts that every dashboard updates live WITHOUT a reload. Usage: node e2e/full-flow.mjs [light|dark]
import { launch, apiLogin, openAs, sleep, BASE } from './browser.mjs';

const theme = process.argv[2] || 'light';
let step = 0;
const ok = (msg) => console.log(`  ✔ ${++step}. ${msg}`);
const fail = (msg) => { console.error(`  ✖ ${msg}`); process.exitCode = 1; };

const browser = await launch();
const W = { timeout: 15000 };
try {
  /* ---------- 1. Login / roles ---------- */
  const login = await openAs(browser, null, '/', { width: 1280, height: 860, theme });
  await login.click('#role-seg [data-value="user"]');
  await login.click('#demo-fill');
  await login.screenshot({ path: 'shots/flow-1-login.png' });
  await Promise.all([login.waitForNavigation({ waitUntil: 'load' }), login.click('#submit')]);
  if (!login.url().endsWith('/user.html')) throw new Error(`customer login landed on ${login.url()}`);
  ok('Customer signs in through the login form and lands on the customer dashboard');

  // wrong password shows an inline error, not a crash
  const bad = await openAs(browser, null, '/', { width: 1000, height: 800, theme });
  await bad.type('#email', 'user@logipulse.com'); await bad.type('#password', 'nope-nope');
  await bad.click('#submit'); await bad.waitForSelector('#notice.error', W);
  ok('Wrong password is rejected with an inline message');
  await bad.close();

  const user = login;
  const rider = await openAs(browser, await apiLogin('rider', 'rider@logipulse.com'), '/rider.html', { width: 1440, height: 900, theme: theme === 'light' ? 'dark' : theme });
  const admin = await openAs(browser, await apiLogin('admin', 'admin@logipulse.com'), '/admin.html#orders', { width: 1440, height: 900, theme });
  await user.waitForSelector('#orders article, #orders-empty .empty', W);
  await rider.waitForSelector('#rlist article', W);

  /* ---------- 2. User creates a request ---------- */
  await user.click('#pickup'); await user.waitForSelector('#combo-list li[data-i]', W);
  await user.click('#combo-list li[data-i]:nth-child(5)');   // Lucky One Mall (far from the rider's default spot)
  const stamp = Date.now() % 100000;
  await user.type('#delivery', `Flat ${stamp}, Block 7, Gulshan-e-Iqbal`);
  await user.type('#desc', 'E2E parcel: documents, handle with care');
  const before = await user.$$eval('#orders article', (a) => a.length);
  await user.click('#req-submit');
  await user.waitForFunction((n) => document.querySelectorAll('#orders article').length > n, W, before);
  const orderId = Number(await user.$eval('#orders article:first-child .oc-id .mono', (e) => e.textContent.replace('#', '')));
  const status0 = await user.$eval('#orders article:first-child .badge', (e) => e.textContent.trim());
  if (status0 !== 'Pending') throw new Error(`new order status was ${status0}`);
  ok(`Customer submits a request; order #${orderId} appears in My Orders as Pending`);

  /* ---------- 3. Rider finds it (no refresh) ---------- */
  await rider.waitForSelector(`#rlist [data-id="${orderId}"]`, W);
  ok('The new order appears on the rider dashboard live, without a reload');
  await admin.waitForSelector(`#o-body tr[data-oid="${orderId}"]`, W);
  ok('...and on the admin orders table');

  /* ---------- 4. Smart nearby pickup ---------- */
  const readDist = () => rider.$$eval('#rlist article', (cards) => cards.map((c) => {
    const t = c.querySelector('.dist').innerText.replace(/\s+/g, '');
    return { id: Number(c.dataset.id), km: t.endsWith('km') ? parseFloat(t) : parseFloat(t) / 1000 };
  }));
  let list = await readDist();
  const sorted = (l) => l.every((x, i) => i === 0 || l[i - 1].km <= x.km + 1e-9);
  if (!sorted(list)) throw new Error(`not sorted nearest-first: ${JSON.stringify(list)}`);
  ok(`Rider list is sorted nearest-first by real distance (${list.slice(0, 3).map((x) => `#${x.id}:${x.km.toFixed(1)}km`).join(', ')}…)`);
  const target = list.find((x) => x.id === orderId);
  // Move the rider on the map (click) -> distances change and the list re-sorts
  const box = await rider.$eval('#map', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await rider.mouse.click(box.x + box.w * 0.82, box.y + box.h * 0.22);
  await rider.waitForFunction((id, km) => { const c = document.querySelector(`#rlist [data-id="${id}"] .dist`); if (!c) return false; const t = c.innerText.replace(/\s+/g, ''); const v = t.endsWith('km') ? parseFloat(t) : parseFloat(t) / 1000; return Math.abs(v - km) > 0.15; }, W, orderId, target.km);
  list = await readDist();
  if (!sorted(list)) throw new Error('list not re-sorted after the rider moved');
  const moved = list.find((x) => x.id === orderId);
  ok(`Moving the rider on the map recalculates distances instantly (#${orderId}: ${target.km.toFixed(1)} km -> ${moved.km.toFixed(1)} km) and keeps the list sorted`);
  await rider.screenshot({ path: 'shots/flow-4-rider-nearby.png' });

  /* ---------- 5. Rider accepts ---------- */
  await rider.click(`[data-accept="${orderId}"]`);
  await rider.waitForSelector('#sec-active:not(.hidden) #next-btn', W);
  ok('Rider accepts; the screen switches to the active-delivery view');
  await user.waitForFunction((id) => document.querySelector(`#orders [data-key="${id}"] .oc-rider`)?.textContent.includes('Hamza'), W, orderId);
  ok('Customer sees the assigned rider (Hamza Ali) on the order card, live');
  await admin.waitForFunction((id) => /Accepted/.test(document.querySelector(`#o-body tr[data-oid="${id}"]`)?.textContent ?? ''), W, orderId);
  ok('Admin table shows the order as Accepted');
  // a second rider cannot take it
  const other = await apiLogin('rider', 'usman@logipulse.com');
  const dup = await fetch(`${BASE}/api/orders/${orderId}/accept`, { method: 'PATCH', headers: { authorization: `Bearer ${other.token}` } });
  if (dup.status !== 409) throw new Error(`second accept returned ${dup.status}`);
  ok('A second rider trying to accept the same order is refused (409)');

  /* ---------- 6. Chat ---------- */
  await user.click(`#orders [data-key="${orderId}"]`);
  await user.waitForSelector('.order-drawer #tab-chat', W);
  await user.click('#tab-chat');
  await user.waitForSelector('#pane-chat .chat-form input', W);
  await user.type('#pane-chat .chat-form input', 'Please ring the bell twice');
  await user.keyboard('Enter');
  await rider.click('#a-tabs [data-value="chat"]');
  await rider.waitForFunction(() => [...document.querySelectorAll('#a-chat .bubble')].some((b) => b.textContent.includes('ring the bell twice')), W);
  ok('Customer sends a message; the rider receives it live');
  await rider.type('#a-chat .chat-form input', 'On my way, 10 minutes');
  await rider.keyboard('Enter');
  await user.waitForFunction(() => [...document.querySelectorAll('#pane-chat .bubble')].some((b) => b.textContent.includes('10 minutes')), W);
  ok('Rider replies; the customer receives it live (thread is scoped to this order)');
  await user.screenshot({ path: 'shots/flow-6-user-chat.png' });
  await rider.screenshot({ path: 'shots/flow-6-rider-chat.png' });
  await user.click('#d-tabs [data-value="details"]');

  /* ---------- 7. Status changes ---------- */
  await rider.click('#a-tabs [data-value="order"]');
  const expected = ['Picked up', 'In transit'];
  for (const label of expected) {
    await rider.waitForSelector('#next-btn:not(.is-loading)', W);
    await rider.click('#next-btn');
    await user.waitForFunction((id, l) => document.querySelector(`#orders [data-key="${id}"] .badge[data-status]`)?.textContent.trim() === l, W, orderId, label);
    ok(`Rider marks "${label}"; the customer's order updates live`);
  }
  await user.screenshot({ path: 'shots/flow-7-user-tracking.png' });
  await rider.waitForSelector('#next-btn:not(.is-loading)', W);
  await rider.click('#next-btn');
  await rider.waitForSelector('.success-overlay', W);
  await rider.screenshot({ path: 'shots/flow-7-delivered.png' });
  await rider.click('.success-overlay #ok-btn');
  await user.waitForFunction((id) => document.querySelector(`#orders [data-key="${id}"] .badge[data-status]`)?.textContent.trim() === 'Delivered', W, orderId);
  await admin.waitForFunction((id) => /Delivered/.test(document.querySelector(`#o-body tr[data-oid="${id}"]`)?.textContent ?? ''), W, orderId);
  ok('Delivered: celebration on the rider screen, and customer + admin both show Delivered');
  await rider.waitForSelector('#sec-list:not(.hidden)', W);
  ok('The rider is returned to the nearby-requests list, free for the next job');

  /* ---------- 8. Admin dashboard ---------- */
  await admin.evaluate(() => { location.hash = 'overview'; });
  await admin.waitForSelector('#stat-grid .stat .value', W); await sleep(1400);
  const tiles = await admin.$$eval('#stat-grid .stat', (s) => s.map((x) => x.querySelector('.value').textContent));
  const rowsOv = await admin.$$eval('#ov-orders tr', (r) => r.length);
  if (!rowsOv) throw new Error('overview recent orders empty');
  await admin.screenshot({ path: 'shots/flow-8-admin-overview.png', fullPage: true });
  ok(`Admin overview shows live stats (${tiles.join(' / ')}), fleet and recent orders`);

  /* ---------- 9. Priority ---------- */
  await admin.evaluate(() => { location.hash = 'orders'; });
  await admin.waitForSelector('#o-body select.prio-select', W);
  const pendingId = await admin.$$eval('#o-body tr.row', (rows) => { const r = rows.find((x) => /Pending/.test(x.textContent) && /Normal/.test(x.querySelector('select')?.selectedOptions[0]?.textContent ?? '')); return r ? Number(r.dataset.oid) : null; });
  await admin.select(`select[data-prio="${pendingId}"]`, 'URGENT');
  await admin.waitForFunction((id) => document.querySelector(`select[data-prio="${id}"]`)?.dataset.v === 'URGENT', W, pendingId);
  await rider.click('#prio-seg [data-value="URGENT"]');
  await rider.waitForFunction((id) => document.querySelector(`#rlist [data-id="${id}"] [data-priority="URGENT"]`) && [...document.querySelectorAll('#rlist article')].every((c) => c.querySelector('[data-priority="URGENT"]')), W, pendingId);
  ok(`Admin escalates #${pendingId} to Urgent; the rider sees it highlighted and can filter to Urgent only`);
  await rider.screenshot({ path: 'shots/flow-9-rider-urgent.png' });
  await admin.evaluate(() => { location.hash = 'priority'; });
  await admin.waitForSelector('#p-tiles .pt-value', W); await sleep(1300);
  const counts = await admin.$$eval('#p-tiles .pt-value', (v) => v.map((x) => Number(x.textContent)));
  if (counts.every((n) => n === 0)) throw new Error('priority analytics are all zero');
  await admin.screenshot({ path: 'shots/flow-9-admin-priority.png' });
  ok(`Admin priority analytics are live (Normal ${counts[0]} / High ${counts[1]} / Urgent ${counts[2]})`);

  const issues = [user, rider, admin].flatMap((p) => p.logs).filter((l) => !/openstreetmap|ERR_|favicon/.test(l));
  if (issues.length) { console.log('\nConsole issues:\n' + issues.join('\n')); process.exitCode = 1; }
  else console.log('\n  No console errors or failed requests on any dashboard.');
} catch (err) {
  fail(err.message);
} finally {
  await browser.close();
}
console.log(process.exitCode ? '\nE2E FAILED' : `\nE2E PASSED (${step} checks)`);
