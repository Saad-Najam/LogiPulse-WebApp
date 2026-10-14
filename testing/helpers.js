// Shared test utilities. Import AFTER setting process.env.NODE_ENV in the test file.
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';

export const PASSWORD = 'password123';
let base = '';
export const setBase = (url) => { base = url; };

export async function call(method, url, { token, body, raw } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}

export async function login(role, email) {
  const r = await call('POST', '/api/auth/login', { body: { role, email, password: PASSWORD } });
  assert.equal(r.status, 200, `login ${email}`);
  return { token: r.body.token, user: r.body.user };
}

export const order = (over = {}) => ({
  pickup_address: 'Test pickup street', pickup_lat: 24.86, pickup_lng: 67.0, delivery_address: 'Test drop street', description: 'box', ...over,
});

export const waitFor = (socket, event, ms = 3000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    socket.once(event, (p) => { clearTimeout(t); resolve(p); });
  });

export const openSocket = (token) =>
  new Promise((resolve, reject) => {
    const s = connect(base, { auth: { token }, transports: ['websocket'], forceNew: true });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });

// Create an order as `user`, have `rider` accept it, return its id.
export async function assignedOrder(user, rider) {
  const { body } = await call('POST', '/api/orders', { token: user.token, body: order() });
  const acc = await call('PATCH', `/api/orders/${body.id}/accept`, { token: rider.token });
  assert.equal(acc.status, 200);
  return body.id;
}

// Walk an assigned order to DELIVERED so the rider is free again for later tests.
export async function deliver(rider, id) {
  for (const status of ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']) {
    const r = await call('PATCH', `/api/orders/${id}/status`, { token: rider.token, body: { status } });
    assert.equal(r.status, 200, `deliver ${id} -> ${status}`);
  }
}
