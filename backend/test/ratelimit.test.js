process.env.NODE_ENV = 'test';
// Rate limiting stays ENABLED in this file. Limiter state is per-process, so each limiter is exercised with its own key.

import test from 'node:test';
import assert from 'node:assert/strict';
import { call, login, order, setBase, assignedOrder } from '../testing/helpers.js';

const { start } = await import('../src/server.js');

let app;
test.before(async () => {
  app = await start({ port: 0 });
  setBase(`http://localhost:${app.port}`);
});
test.after(() => app.stop());

test('register limiter: 20 sign-ups / hour / IP, then 429', async () => {
  let last;
  for (let i = 0; i < 21; i++) {
    last = await call('POST', '/api/auth/register', { body: { name: 'Spam Bot', email: `spam${i}@example.com`, password: 'longenough1', role: 'user' } });
    if (i < 20) assert.equal(last.status, 201, `signup ${i}`);
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.error, 'TOO_MANY_REGISTRATIONS');
  assert.ok(last.headers.get('ratelimit') || last.headers.get('ratelimit-policy'), 'draft-7 rate limit headers');
});

test('order-creation limiter: 20 / min / user, other users unaffected', async () => {
  const user = await login('user', 'user@logipulse.com');
  const other = await login('user', 'bilal@logipulse.com');
  let last;
  for (let i = 0; i < 21; i++) {
    last = await call('POST', '/api/orders', { token: user.token, body: order() });
    if (i < 20) assert.equal(last.status, 201, `order ${i}`);
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.error, 'ORDER_RATE_LIMIT');
  assert.equal((await call('POST', '/api/orders', { token: other.token, body: order() })).status, 201); // keyed per user
});

test('message limiter: 30 / min per user via REST', async () => {
  const user = await login('user', 'sara@logipulse.com');
  const rider = await login('rider', 'rider@logipulse.com');
  const id = await assignedOrder(user, rider);
  let last;
  for (let i = 0; i < 31; i++) {
    last = await call('POST', `/api/orders/${id}/messages`, { token: user.token, body: { content: `m${i}` } });
    if (i < 30) assert.equal(last.status, 201, `msg ${i}`);
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.error, 'MESSAGE_RATE_LIMIT');
  // the rider has their own bucket (same order, different identity)
  assert.equal((await call('POST', `/api/orders/${id}/messages`, { token: rider.token, body: { content: 'still fine' } })).status, 201);
});

test('location limiter: 60 / min per rider', async () => {
  const rider = await login('rider', 'usman@logipulse.com');
  let last;
  for (let i = 0; i < 61; i++) {
    last = await call('PATCH', '/api/riders/me/location', { token: rider.token, body: { lat: 24.8 + i / 1e5, lng: 67 } });
    if (i < 60) assert.equal(last.status, 200, `loc ${i}`);
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.error, 'LOCATION_RATE_LIMIT');
});

test('auth limiter blocks brute force after 10 failed logins, then reports 429', async () => {
  const attempt = () => call('POST', '/api/auth/login', { body: { role: 'user', email: 'user@logipulse.com', password: 'wrong' } });
  for (let i = 0; i < 10; i++) assert.equal((await attempt()).status, 401);
  const blocked = await attempt();
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error, 'TOO_MANY_LOGIN_ATTEMPTS');
});
