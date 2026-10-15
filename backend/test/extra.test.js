process.env.NODE_ENV = 'test';
process.env.DISABLE_RATE_LIMIT = '1';
process.env.DATABASE_URL = 'postgres://must-be-ignored-in-tests:1/none'; // tests must never use DATABASE_URL

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import jwt from 'jsonwebtoken';
import { call, login, order, setBase, assignedOrder, deliver, openSocket, waitFor } from '../testing/helpers.js';

const { start } = await import('../src/server.js');
const { config } = await import('../src/config.js');
const { query, dbKind } = await import('../src/db.js');

let app;
test.before(async () => {
  app = await start({ port: 0 });
  setBase(`http://localhost:${app.port}`);
});
test.after(() => app.stop());

test('config: tests ignore DATABASE_URL and use embedded Postgres', () => {
  assert.equal(config.databaseUrl, null);
  assert.equal(dbKind(), 'pglite');
});

test('row level security is enabled on every table (Supabase REST API lock-out)', async () => {
  const { rows } = await query(
    `SELECT relname, relrowsecurity FROM pg_class
     WHERE relname IN ('users','riders','admins','orders','messages','order_status_log','priority_change_log') ORDER BY relname`,
  );
  assert.equal(rows.length, 7);
  assert.deepEqual(rows.filter((r) => !r.relrowsecurity), []);
});

test('GET /api/locations is public and returns real coordinates', async () => {
  const r = await call('GET', '/api/locations');
  assert.equal(r.status, 200);
  assert.ok(r.body.length >= 10);
  for (const l of r.body) {
    assert.ok(l.name && Math.abs(l.lat) <= 90 && Math.abs(l.lng) <= 180, JSON.stringify(l));
  }
  // an order built from a location is accepted as-is
  const user = await login('user', 'user@logipulse.com');
  const loc = r.body[0];
  const created = await call('POST', '/api/orders', { token: user.token, body: order({ pickup_address: loc.name, pickup_lat: loc.lat, pickup_lng: loc.lng }) });
  assert.equal(created.status, 201);
});

test('rider: GET /riders/me, /orders/active and /orders/mine survive a "reload"', async () => {
  const user = await login('user', 'bilal@logipulse.com');
  const rider = await login('rider', 'zain@logipulse.com');
  const other = await login('rider', 'usman@logipulse.com');

  const me = await call('GET', '/api/riders/me', { token: rider.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.id, rider.user.id);
  assert.equal(typeof me.body.current_lat, 'number');
  assert.equal(me.body.password_hash, undefined);
  assert.equal((await call('GET', '/api/riders/me', { token: user.token })).status, 403);

  assert.equal((await call('GET', '/api/orders/active', { token: rider.token })).body, null);
  const id = await assignedOrder(user, rider);
  const active = (await call('GET', '/api/orders/active', { token: rider.token })).body;
  assert.equal(active.id, id);
  assert.equal(active.status, 'ACCEPTED');
  assert.equal((await call('GET', '/api/orders/active', { token: other.token })).body, null);
  assert.equal((await call('GET', '/api/orders/active', { token: user.token })).status, 403);

  const mine = (await call('GET', '/api/orders/mine', { token: rider.token })).body;
  assert.ok(mine.length >= 1 && mine.every((o) => o.rider_id === rider.user.id));

  for (const status of ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']) {
    await call('PATCH', `/api/orders/${id}/status`, { token: rider.token, body: { status } });
  }
  assert.equal((await call('GET', '/api/orders/active', { token: rider.token })).body, null); // delivered -> no longer active
  assert.equal((await call('GET', '/api/orders/mine', { token: rider.token })).body.find((o) => o.id === id).status, 'DELIVERED');
});

test('messages: ?after= returns only newer messages', async () => {
  const user = await login('user', 'sara@logipulse.com');
  const rider = await login('rider', 'usman@logipulse.com');
  const id = await assignedOrder(user, rider);
  const m1 = (await call('POST', `/api/orders/${id}/messages`, { token: user.token, body: { content: 'one' } })).body;
  await call('POST', `/api/orders/${id}/messages`, { token: rider.token, body: { content: 'two' } });
  const newer = (await call('GET', `/api/orders/${id}/messages?after=${m1.id}`, { token: user.token })).body;
  assert.deepEqual(newer.map((m) => m.content), ['two']);
  assert.equal((await call('GET', `/api/orders/${id}/messages?after=0`, { token: user.token })).body.length, 2);
  assert.equal((await call('GET', `/api/orders/${id}/messages?after=abc`, { token: user.token })).status, 400);
  // messages never leak across orders
  const rider2 = await login('rider', 'rider@logipulse.com');
  const other = await assignedOrder(user, rider2);
  assert.deepEqual((await call('GET', `/api/orders/${other}/messages`, { token: user.token })).body, []);
  await deliver(rider, id);
  await deliver(rider2, other);
});

test('expired and tampered tokens are rejected with specific codes', async () => {
  const expired = jwt.sign({ id: 1, role: 'admin', name: 'x', email: 'x@x.com' }, config.jwtSecret, { expiresIn: -10 });
  assert.equal((await call('GET', '/api/auth/me', { token: expired })).body.error, 'TOKEN_EXPIRED');
  const forged = jwt.sign({ id: 1, role: 'admin' }, 'some-other-secret');
  assert.equal((await call('GET', '/api/admin/stats', { token: forged })).body.error, 'INVALID_TOKEN');
  const algNone = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' + Buffer.from('{"id":1,"role":"admin"}').toString('base64url') + '.';
  assert.equal((await call('GET', '/api/admin/stats', { token: algNone })).status, 401);
  // a valid token for a deleted account: /me says so rather than crashing
  const ghost = jwt.sign({ id: 99999, role: 'user', name: 'g', email: 'g@g.com' }, config.jwtSecret);
  assert.equal((await call('GET', '/api/auth/me', { token: ghost })).status, 404);
});

test('logout needs a token, admin /me works, riders 404 handled', async () => {
  const admin = await login('admin', 'admin@logipulse.com');
  assert.equal((await call('POST', '/api/auth/logout', { token: admin.token })).body.ok, true);
  assert.equal((await call('POST', '/api/auth/logout')).status, 401);
  assert.equal((await call('GET', '/api/auth/me', { token: admin.token })).body.role, 'admin');
  assert.equal((await call('GET', '/api/riders/99999', { token: admin.token })).body.error, 'RIDER_NOT_FOUND');
  assert.equal((await call('GET', '/api/riders/0', { token: admin.token })).status, 400);
});

test('two concurrent status taps: exactly one applies', async () => {
  const user = await login('user', 'user@logipulse.com');
  const rider = await login('rider', 'rider@logipulse.com');
  const id = await assignedOrder(user, rider);
  const tap = () => call('PATCH', `/api/orders/${id}/status`, { token: rider.token, body: { status: 'PICKED_UP' } });
  const [a, b] = await Promise.all([tap(), tap()]);
  assert.equal([a, b].filter((r) => r.status === 200).length, 1);
  assert.ok([a, b].some((r) => [400, 409].includes(r.status)));
  const hist = (await call('GET', `/api/orders/${id}/status-history`, { token: rider.token })).body;
  assert.deepEqual(hist.map((h) => h.status), ['PENDING', 'ACCEPTED', 'PICKED_UP']); // no duplicate log row
  for (const status of ['IN_TRANSIT', 'DELIVERED']) await call('PATCH', `/api/orders/${id}/status`, { token: rider.token, body: { status } });
  assert.equal((await call('GET', '/api/orders/active', { token: rider.token })).body, null);
});

test('admin priority edge cases', async () => {
  const admin = await login('admin', 'admin@logipulse.com');
  const user = await login('user', 'user@logipulse.com');
  const { body: o } = await call('POST', '/api/orders', { token: user.token, body: order() });
  const a0 = (await call('GET', '/api/admin/priority-analytics', { token: admin.token })).body;
  // same priority again: no-op, no extra escalation row
  await call('PATCH', `/api/orders/${o.id}/priority`, { token: admin.token, body: { priority: 'NORMAL' } });
  const a1 = (await call('GET', '/api/admin/priority-analytics', { token: admin.token })).body;
  assert.deepEqual(a1.recentEscalations, a0.recentEscalations);
  // user-supplied priority on create is ignored (only admins escalate)
  const sneaky = await call('POST', '/api/orders', { token: user.token, body: { ...order(), priority: 'URGENT' } });
  assert.equal(sneaky.body.priority, 'NORMAL');
  assert.equal((await call('PATCH', '/api/orders/99999/priority', { token: admin.token, body: { priority: 'HIGH' } })).status, 404);
  // priority lowers back and counts follow
  await call('PATCH', `/api/orders/${o.id}/priority`, { token: admin.token, body: { priority: 'URGENT' } });
  const up = (await call('GET', '/api/admin/priority-analytics', { token: admin.token })).body;
  await call('PATCH', `/api/orders/${o.id}/priority`, { token: admin.token, body: { priority: 'HIGH' } });
  const down = (await call('GET', '/api/admin/priority-analytics', { token: admin.token })).body;
  assert.equal(down.urgent, up.urgent - 1);
  assert.equal(down.high, up.high + 1);
});

test('socket: message rate limit (30/min) and rider returns to pool after toggling availability', async () => {
  const user = await login('user', 'user@logipulse.com');
  const rider = await login('rider', 'zain@logipulse.com');
  const id = await assignedOrder(user, rider);
  const sUser = await openSocket(user.token);
  let limited = 0;
  for (let i = 0; i < 32; i++) {
    const ack = await sUser.emitWithAck('message:send', { orderId: id, content: `m${i}` });
    if (ack.error === 'MESSAGE_RATE_LIMIT') limited++;
  }
  assert.equal(limited, 2);
  sUser.close();
  for (const status of ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']) await call('PATCH', `/api/orders/${id}/status`, { token: rider.token, body: { status } });

  // rider goes offline -> leaves pool (no order:new); back online -> receives again
  const sRider = await openSocket(rider.token);
  await new Promise((r) => setTimeout(r, 150));
  await call('PATCH', '/api/riders/me/availability', { token: rider.token, body: { is_available: false } });
  let got = false;
  sRider.once('order:new', () => { got = true; });
  await call('POST', '/api/orders', { token: user.token, body: order() });
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(got, false, 'offline rider must not receive new orders');
  await call('PATCH', '/api/riders/me/availability', { token: rider.token, body: { is_available: true } });
  const back = waitFor(sRider, 'order:new');
  await call('POST', '/api/orders', { token: user.token, body: order() });
  assert.ok((await back).id);
  sRider.close();
});

test('production refuses to boot without JWT_SECRET', () => {
  const r = spawnSync(process.execPath, ['src/server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: '', PORT: '0' },
    encoding: 'utf8',
    timeout: 20000,
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /JWT_SECRET must be set/);
});
