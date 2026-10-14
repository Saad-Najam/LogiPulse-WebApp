const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
process.env.DB_FILE = path.join(os.tmpdir(), `logipulse-test-${process.pid}.json`);

const app = require('../server/index');
const { haversineDistance } = require('../server/lib/haversine');

let base, server;
test.before(() => new Promise((r) => { server = app.listen(0, () => { base = `http://localhost:${server.address().port}/api`; r(); }); }));
test.after(() => server.close());

const call = async (method, url, body) => {
  const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};

test('haversine: Karachi points give a plausible distance', () => {
  const d = haversineDistance(24.8607, 67.0011, 24.8607, 67.0011);
  assert.strictEqual(d, 0);
  const km = haversineDistance(24.8607, 67.0011, 24.9056, 67.0822);
  assert.ok(km > 8 && km < 11, `got ${km}`);
});

test('full courier flow, race condition and chat scoping', async () => {
  const created = await call('POST', '/orders', { user_id: 1, pickup_address: 'A', pickup_lat: 24.86, pickup_lng: 67, delivery_address: 'B', description: 'box', priority: 'URGENT' });
  assert.strictEqual(created.status, 201);
  const id = created.body.id;
  assert.strictEqual(created.body.status, 'PENDING');

  assert.strictEqual((await call('GET', `/orders/${id}/messages?role=user&id=1`)).status, 409); // no chat while PENDING

  const [a, b] = await Promise.all([
    call('POST', `/orders/${id}/accept`, { rider_id: 1 }),
    call('POST', `/orders/${id}/accept`, { rider_id: 2 }),
  ]);
  assert.deepStrictEqual([a.status, b.status].sort(), [200, 409]);
  const winner = a.status === 200 ? 1 : 2;
  const loser = winner === 1 ? 2 : 1;

  assert.strictEqual((await call('GET', `/orders/${id}`)).body.rider_id, winner);
  assert.strictEqual((await call('POST', `/orders/${id}/status`, { rider_id: loser, status: 'PICKED_UP' })).status, 403);
  assert.strictEqual((await call('POST', `/orders/${id}/status`, { rider_id: winner, status: 'DELIVERED' })).status, 400); // skip not allowed

  assert.strictEqual((await call('POST', `/orders/${id}/messages`, { role: 'user', id: 1, content: 'hi' })).status, 201);
  assert.strictEqual((await call('POST', `/orders/${id}/messages`, { role: 'user', id: 2, content: 'x' })).status, 403); // other user
  assert.strictEqual((await call('GET', `/orders/${id}/messages?role=rider&id=${winner}`)).body.length, 1);

  for (const s of ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']) {
    assert.strictEqual((await call('POST', `/orders/${id}/status`, { rider_id: winner, status: s })).status, 200);
  }
  const riders = (await call('GET', '/riders')).body;
  assert.strictEqual(riders.find((r) => r.id === winner).is_available, true);
  assert.ok((await call('GET', '/stats')).body.priority.URGENT >= 2);
});
