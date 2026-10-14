process.env.NODE_ENV = 'test';
process.env.DISABLE_RATE_LIMIT = '1';

import test from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';

const { start } = await import('../src/server.js');
const { haversineDistance } = await import('../src/lib/haversine.js');

let app;
let base;
const PASSWORD = 'password123';

test.before(async () => {
  app = await start({ port: 0 });
  base = `http://localhost:${app.port}`;
});
test.after(() => app.stop());

async function call(method, url, { token, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function login(role, email) {
  const r = await call('POST', '/api/auth/login', { body: { role, email, password: PASSWORD } });
  assert.equal(r.status, 200, `login ${email}`);
  return { token: r.body.token, user: r.body.user };
}
const order = (over = {}) => ({
  pickup_address: 'Test pickup street', pickup_lat: 24.86, pickup_lng: 67.0, delivery_address: 'Test drop street', description: 'box', ...over,
});

const waitFor = (socket, event, ms = 3000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    socket.once(event, (p) => { clearTimeout(t); resolve(p); });
  });
const open = (token) =>
  new Promise((resolve, reject) => {
    const s = connect(base, { auth: { token }, transports: ['websocket'], forceNew: true });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });

test('haversine gives real distances', () => {
  assert.equal(haversineDistance(24.86, 67, 24.86, 67), 0);
  const km = haversineDistance(24.8607, 67.0011, 24.9056, 67.0822);
  assert.ok(km > 8 && km < 11, `got ${km}`);
});

test('health, seed data and 404 shape', async () => {
  const h = await call('GET', '/api/health');
  assert.equal(h.body.ok, true);
  assert.equal((await call('GET', '/api/nope')).status, 404);
});

test('auth: login, bad creds, /me, register, duplicate, validation, missing/invalid token', async () => {
  const bad = await call('POST', '/api/auth/login', { body: { role: 'user', email: 'user@logipulse.com', password: 'wrong' } });
  assert.equal(bad.status, 401);
  assert.equal(bad.body.error, 'INVALID_CREDENTIALS');
  // a user's email must not work against the rider table
  assert.equal((await call('POST', '/api/auth/login', { body: { role: 'rider', email: 'user@logipulse.com', password: PASSWORD } })).status, 401);
  assert.equal((await call('POST', '/api/auth/login', { body: { role: 'user' } })).status, 400);

  const { token } = await login('user', 'user@logipulse.com');
  const me = await call('GET', '/api/auth/me', { token });
  assert.equal(me.body.role, 'user');
  assert.equal(me.body.password_hash, undefined);

  const reg = await call('POST', '/api/auth/register', { body: { name: 'New Person', email: 'New@Example.com', password: 'longenough1', role: 'user' } });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.user.email, 'new@example.com');
  assert.equal((await call('POST', '/api/auth/register', { body: { name: 'Dup', email: 'new@example.com', password: 'longenough1', role: 'user' } })).status, 409);
  assert.equal((await call('POST', '/api/auth/register', { body: { name: 'Admin', email: 'x@example.com', password: 'longenough1', role: 'admin' } })).status, 400);

  assert.equal((await call('GET', '/api/auth/me')).body.error, 'MISSING_TOKEN');
  assert.equal((await call('GET', '/api/auth/me', { token: 'garbage' })).body.error, 'INVALID_TOKEN');
});

test('role-based access control', async () => {
  const user = await login('user', 'user@logipulse.com');
  const rider = await login('rider', 'rider@logipulse.com');
  const admin = await login('admin', 'admin@logipulse.com');

  assert.equal((await call('GET', '/api/orders', { token: user.token })).status, 403);
  assert.equal((await call('GET', '/api/users', { token: rider.token })).status, 403);
  assert.equal((await call('GET', '/api/admin/stats', { token: user.token })).status, 403);
  assert.equal((await call('POST', '/api/orders', { token: rider.token, body: order() })).status, 403);
  assert.equal((await call('GET', '/api/orders/available', { token: user.token })).status, 403);
  assert.equal((await call('PATCH', '/api/orders/101/priority', { token: rider.token, body: { priority: 'URGENT' } })).status, 403);
  assert.equal((await call('GET', '/api/orders', { token: admin.token })).status, 200);
  assert.equal((await call('GET', '/api/orders/abc', { token: admin.token })).status, 400);
  assert.equal((await call('GET', '/api/orders/99999', { token: admin.token })).status, 404);
});

test('order validation and ownership', async () => {
  const user = await login('user', 'user@logipulse.com');
  const other = await login('user', 'bilal@logipulse.com');
  assert.equal((await call('POST', '/api/orders', { token: user.token, body: order({ pickup_lat: 999 }) })).status, 400);
  assert.equal((await call('POST', '/api/orders', { token: user.token, body: order({ pickup_address: 'x' }) })).status, 400);

  const created = await call('POST', '/api/orders', { token: user.token, body: order() });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'PENDING');
  assert.equal(created.body.priority, 'NORMAL');
  assert.equal(created.body.rider, null);

  assert.equal((await call('GET', `/api/orders/${created.body.id}`, { token: other.token })).status, 403);
  const mine = await call('GET', '/api/orders/mine', { token: user.token });
  assert.ok(mine.body.some((o) => o.id === created.body.id));
  assert.ok(mine.body.every((o) => o.user_id === user.user.id));
});

test('smart nearby pickup: real distance, sorted, follows rider location', async () => {
  const rider = await login('rider', 'rider@logipulse.com');
  const a = await call('GET', '/api/orders/available', { token: rider.token });
  assert.ok(a.body.length >= 5);
  const kms = a.body.map((o) => o.distance_km);
  assert.deepEqual(kms, [...kms].sort((x, y) => x - y));
  const dolmen = a.body.find((o) => o.pickup_address === 'Dolmen Mall Clifton');
  const expected = haversineDistance(24.8607, 67.0011, dolmen.pickup_lat, dolmen.pickup_lng);
  assert.ok(Math.abs(dolmen.distance_km - expected) < 0.01);

  // move the rider across the city -> distances and order change
  assert.equal((await call('PATCH', '/api/riders/me/location', { token: rider.token, body: { lat: 24.9419, lng: 67.1228 } })).status, 200);
  const b = await call('GET', '/api/orders/available', { token: rider.token });
  assert.equal(b.body[0].pickup_address, 'Karachi University');
  assert.ok(b.body[0].distance_km < 0.1);
  assert.notEqual(b.body.find((o) => o.id === dolmen.id).distance_km, dolmen.distance_km);
  assert.equal((await call('PATCH', '/api/riders/me/location', { token: rider.token, body: { lat: 'x', lng: 1 } })).status, 400);

  // explicit coordinates override the stored position
  const c = await call('GET', '/api/orders/available?lat=24.8002&lng=67.0305', { token: rider.token });
  assert.equal(c.body[0].pickup_address, 'Dolmen Mall Clifton');
  // restore
  await call('PATCH', '/api/riders/me/location', { token: rider.token, body: { lat: 24.8607, lng: 67.0011 } });
});

test('full courier flow, chat gating/scoping, race condition, state machine', async () => {
  const user = await login('user', 'user@logipulse.com');
  const stranger = await login('user', 'sara@logipulse.com');
  const r1 = await login('rider', 'rider@logipulse.com');
  const r2 = await login('rider', 'usman@logipulse.com');
  const admin = await login('admin', 'admin@logipulse.com');

  const { body: created } = await call('POST', '/api/orders', { token: user.token, body: order() });
  const id = created.id;

  // chat is closed while PENDING
  assert.equal((await call('POST', `/api/orders/${id}/messages`, { token: user.token, body: { content: 'hi' } })).body.error, 'CHAT_NOT_AVAILABLE');

  // two riders race for the same order: exactly one wins
  const [a, b] = await Promise.all([
    call('PATCH', `/api/orders/${id}/accept`, { token: r1.token }),
    call('PATCH', `/api/orders/${id}/accept`, { token: r2.token }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  const winner = a.status === 200 ? r1 : r2;
  const loser = a.status === 200 ? r2 : r1;
  assert.equal([a, b].find((x) => x.status === 409).body.error, 'ORDER_ALREADY_ACCEPTED');

  // the loser's availability must have been rolled back -> they can still take another order
  const riders = (await call('GET', '/api/riders', { token: admin.token })).body;
  assert.equal(riders.find((r) => r.id === loser.user.id).is_available, true);
  assert.equal(riders.find((r) => r.id === winner.user.id).is_available, false);
  assert.equal(riders.find((r) => r.id === winner.user.id).active_order_id, id);

  // user now sees the rider (step 5)
  const seen = (await call('GET', `/api/orders/${id}`, { token: user.token })).body;
  assert.equal(seen.rider.id, winner.user.id);
  assert.equal(seen.rider_name, winner.user.name);
  assert.equal(seen.status, 'ACCEPTED');

  // busy rider can't accept a second order; it's gone from the pool
  const other = (await call('POST', '/api/orders', { token: user.token, body: order() })).body;
  assert.equal((await call('PATCH', `/api/orders/${other.id}/accept`, { token: winner.token })).body.error, 'RIDER_BUSY');
  const pool = (await call('GET', '/api/orders/available', { token: loser.token })).body;
  assert.ok(!pool.some((o) => o.id === id));
  assert.ok(pool.some((o) => o.id === other.id));

  // chat: both parties see one thread, outsiders are blocked
  assert.equal((await call('POST', `/api/orders/${id}/messages`, { token: user.token, body: { content: 'Please ring the bell' } })).status, 201);
  assert.equal((await call('POST', `/api/orders/${id}/messages`, { token: winner.token, body: { content: 'On my way', sender_role: 'user' } })).status, 201);
  const thread = (await call('GET', `/api/orders/${id}/messages`, { token: winner.token })).body;
  assert.deepEqual(thread.map((m) => m.sender_role), ['user', 'rider']); // sender_role forged in body is ignored
  assert.equal(thread[0].sender_name, user.user.name);
  assert.equal((await call('GET', `/api/orders/${id}/messages`, { token: stranger.token })).status, 403);
  assert.equal((await call('GET', `/api/orders/${id}/messages`, { token: loser.token })).status, 403);
  assert.equal((await call('POST', `/api/orders/${id}/messages`, { token: stranger.token, body: { content: 'x' } })).status, 403);
  assert.equal((await call('POST', `/api/orders/${id}/messages`, { token: user.token, body: { content: '   ' } })).status, 400);
  assert.equal((await call('GET', `/api/orders/${id}/messages`, { token: admin.token })).status, 200);

  // state machine
  const st = (token, status) => call('PATCH', `/api/orders/${id}/status`, { token, body: { status } });
  assert.equal((await st(loser.token, 'PICKED_UP')).status, 403);
  assert.equal((await st(winner.token, 'DELIVERED')).body.error, 'INVALID_STATUS_TRANSITION'); // can't skip steps
  assert.equal((await st(winner.token, 'ACCEPTED')).status, 400);
  for (const s of ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']) {
    const r = await st(winner.token, s);
    assert.equal(r.status, 200);
    assert.equal((await call('GET', `/api/orders/${id}`, { token: user.token })).body.status, s); // visible to user immediately
  }
  assert.equal((await st(winner.token, 'DELIVERED')).status, 400); // terminal

  const hist = (await call('GET', `/api/orders/${id}/status-history`, { token: user.token })).body;
  assert.deepEqual(hist.map((h) => h.status), ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']);

  // delivered frees the rider again
  const after = (await call('GET', '/api/riders', { token: admin.token })).body.find((r) => r.id === winner.user.id);
  assert.equal(after.is_available, true);
  assert.equal(after.active_order_id, null);
  assert.ok(after.delivery_count >= 1);
});

test('rider availability toggle', async () => {
  const r = await login('rider', 'zain@logipulse.com');
  assert.equal((await call('PATCH', '/api/riders/me/availability', { token: r.token, body: { is_available: false } })).body.is_available, false);
  const user = await login('user', 'user@logipulse.com');
  const { body: o } = await call('POST', '/api/orders', { token: user.token, body: order() });
  assert.equal((await call('PATCH', `/api/orders/${o.id}/accept`, { token: r.token })).body.error, 'RIDER_BUSY'); // offline riders can't accept
  assert.equal((await call('PATCH', '/api/riders/me/availability', { token: r.token, body: { is_available: true } })).status, 200);
  assert.equal((await call('PATCH', '/api/riders/me/availability', { token: r.token, body: { is_available: 'yes' } })).status, 400);
});

test('admin: orders list filters/pagination, users, riders, stats, priority analytics', async () => {
  const admin = await login('admin', 'admin@logipulse.com');
  const tok = admin.token;

  const all = (await call('GET', '/api/orders?limit=3&page=1', { token: tok })).body;
  assert.equal(all.orders.length, 3);
  assert.ok(all.total > 3 && all.pages >= 2);
  assert.equal((await call('GET', '/api/orders?status=BOGUS', { token: tok })).status, 400);
  assert.ok((await call('GET', '/api/orders?q=Dolmen', { token: tok })).body.orders.every((o) => /Dolmen/.test(o.pickup_address)));

  const before = (await call('GET', '/api/admin/priority-analytics', { token: tok })).body;
  const target = (await call('GET', '/api/orders?priority=NORMAL&status=PENDING', { token: tok })).body.orders[0];
  const upd = await call('PATCH', `/api/orders/${target.id}/priority`, { token: tok, body: { priority: 'URGENT' } });
  assert.equal(upd.body.priority, 'URGENT');
  assert.equal((await call('PATCH', `/api/orders/${target.id}/priority`, { token: tok, body: { priority: 'MEGA' } })).status, 400);
  const afterA = (await call('GET', '/api/admin/priority-analytics', { token: tok })).body;
  assert.equal(afterA.urgent, before.urgent + 1);
  assert.equal(afterA.normal, before.normal - 1);
  assert.equal(afterA.recentEscalations[0].orderId, target.id);
  assert.equal((await call('GET', `/api/orders?priority=URGENT`, { token: tok })).body.orders.some((o) => o.id === target.id), true);

  // riders filter priority in their pool
  const rider = await login('rider', 'rider@logipulse.com');
  const urgentOnly = (await call('GET', '/api/orders/available?priority=URGENT', { token: rider.token })).body;
  assert.ok(urgentOnly.length >= 1 && urgentOnly.every((o) => o.priority === 'URGENT'));

  const stats = (await call('GET', '/api/admin/stats', { token: tok })).body;
  assert.equal(stats.ordersPerHour.length, 8);
  assert.equal(stats.total_orders, stats.pending_orders + stats.delivered_orders + (stats.active_orders - stats.pending_orders));
  assert.equal(stats.total_riders, 3);

  const users = (await call('GET', '/api/users', { token: tok })).body;
  assert.ok(users.length >= 3 && users.every((u) => u.password_hash === undefined && typeof u.order_count === 'number'));
  const detail = (await call('GET', `/api/users/${users[0].id}`, { token: tok })).body;
  assert.ok(Array.isArray(detail.recentOrders) && detail.recentOrders.length <= 3);
  assert.equal((await call('GET', '/api/users/99999', { token: tok })).status, 404);

  const riders = (await call('GET', '/api/riders', { token: tok })).body;
  assert.ok(riders.every((r) => r.password_hash === undefined));
  assert.ok((await call('GET', `/api/riders/${riders[0].id}`, { token: tok })).body.recentDeliveries);
});

test('malformed and oversized bodies return clean errors', async () => {
  const bad = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{nope' });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).error, 'INVALID_JSON');
  const big = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ x: 'a'.repeat(20000) }) });
  assert.equal(big.status, 413);
});

test('security headers present', async () => {
  const res = await fetch(base + '/api/health');
  assert.ok(res.headers.get('content-security-policy'));
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('sockets: auth required, live events reach the right rooms', async () => {
  await assert.rejects(open('not-a-token'), /UNAUTHORIZED/);

  const user = await login('user', 'user@logipulse.com');
  const stranger = await login('user', 'sara@logipulse.com');
  const rider = await login('rider', 'rider@logipulse.com');
  const rider2 = await login('rider', 'usman@logipulse.com');
  const admin = await login('admin', 'admin@logipulse.com');

  const sUser = await open(user.token);
  const sStranger = await open(stranger.token);
  const sRider = await open(rider.token);
  const sRider2 = await open(rider2.token);
  const sAdmin = await open(admin.token);
  await new Promise((r) => setTimeout(r, 200)); // let async room joins finish

  const events = { rider: [], stranger: [] };
  sStranger.onAny((e) => events.stranger.push(e));

  // order:new -> available riders + admin (not users)
  const newForRider = waitFor(sRider, 'order:new');
  const newForAdmin = waitFor(sAdmin, 'order:new');
  const { body: o } = await call('POST', '/api/orders', { token: user.token, body: order() });
  assert.equal((await newForRider).id, o.id);
  assert.equal((await newForAdmin).id, o.id);

  // accept -> user learns rider, other riders drop the card
  const userGetsRider = waitFor(sUser, 'order:accepted');
  const rider2Drop = waitFor(sRider2, 'order:accepted');
  const adminAvail = waitFor(sAdmin, 'rider:availability_changed');
  await call('PATCH', `/api/orders/${o.id}/accept`, { token: rider.token });
  assert.equal((await userGetsRider).rider.id, rider.user.id);
  assert.equal((await rider2Drop).orderId, o.id);
  assert.deepEqual(await adminAvail, { riderId: rider.user.id, is_available: false });

  // chat room membership: stranger refused, parties accepted, message fan-out
  const refused = await sStranger.emitWithAck('order:join', { orderId: o.id });
  assert.equal(refused.ok, false);
  assert.equal((await sUser.emitWithAck('order:join', { orderId: o.id })).ok, true);
  assert.equal((await sRider.emitWithAck('order:join', { orderId: o.id })).ok, true);
  const gotMsg = waitFor(sRider, 'message:new');
  const ack = await sUser.emitWithAck('message:send', { orderId: o.id, content: 'via websocket' });
  assert.equal(ack.ok, true);
  const msg = await gotMsg;
  assert.equal(msg.content, 'via websocket');
  assert.equal(msg.sender_role, 'user');
  assert.equal((await sStranger.emitWithAck('message:send', { orderId: o.id, content: 'sneaky' })).ok, false);
  assert.equal((await sUser.emitWithAck('message:send', { orderId: o.id, content: '' })).error, 'VALIDATION_ERROR');

  // status + priority + location
  const status = waitFor(sUser, 'order:status_updated');
  await call('PATCH', `/api/orders/${o.id}/status`, { token: rider.token, body: { status: 'PICKED_UP' } });
  assert.equal((await status).status, 'PICKED_UP');

  const prio = waitFor(sRider, 'order:priority_changed');
  await call('PATCH', `/api/orders/${o.id}/priority`, { token: admin.token, body: { priority: 'HIGH' } });
  assert.deepEqual(await prio, { orderId: o.id, priority: 'HIGH' });

  const loc = waitFor(sAdmin, 'rider:location_updated');
  assert.equal((await sRider.emitWithAck('rider:location_update', { lat: 24.87, lng: 67.01 })).ok, true);
  assert.equal((await loc).riderId, rider.user.id);
  assert.equal((await sUser.emitWithAck('rider:location_update', { lat: 24.87, lng: 67.01 })).ok, false); // non-riders refused

  // delivering returns the rider to the pool: they receive the next new order
  await call('PATCH', `/api/orders/${o.id}/status`, { token: rider.token, body: { status: 'IN_TRANSIT' } });
  await call('PATCH', `/api/orders/${o.id}/status`, { token: rider.token, body: { status: 'DELIVERED' } });
  await new Promise((r) => setTimeout(r, 150));
  const again = waitFor(sRider, 'order:new');
  const { body: o2 } = await call('POST', '/api/orders', { token: user.token, body: order() });
  assert.equal((await again).id, o2.id);

  assert.ok(!events.stranger.some((e) => ['message:new', 'order:accepted', 'order:status_updated'].includes(e)), `stranger saw ${events.stranger}`);
  for (const s of [sUser, sStranger, sRider, sRider2, sAdmin]) s.close();
});
