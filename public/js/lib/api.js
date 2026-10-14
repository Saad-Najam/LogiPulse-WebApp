// Thin fetch wrapper. Every dashboard talks to the same REST API; the JWT is attached automatically.
import { getSession, clearSession } from './session.js';

export class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code; }
}

async function request(method, url, body) {
  const token = getSession()?.token;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0, 'NETWORK');
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }

  if (!res.ok) {
    // Expired / invalid token on an authenticated call -> sign out. (Failed logins also return 401, so skip those.)
    if (res.status === 401 && token && !url.startsWith('/api/auth/login')) {
      clearSession();
      location.replace('/?expired=1');
    }
    const msg = friendly(data, res.status);
    throw new ApiError(msg, res.status, data?.error);
  }
  return data;
}

const MESSAGES = {
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  TOO_MANY_LOGIN_ATTEMPTS: 'Too many failed attempts. Please wait a few minutes and try again.',
  ORDER_ALREADY_ACCEPTED: 'Another rider just accepted this order.',
  RIDER_BUSY: 'Finish your active delivery before taking another.',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
  CHAT_NOT_AVAILABLE: 'Chat opens once a rider accepts the order.',
  TOO_MANY_REQUESTS: 'Slow down a little - too many requests.',
  ORDER_RATE_LIMIT: 'You are creating orders too quickly. Try again in a minute.',
  MESSAGE_RATE_LIMIT: 'You are sending messages too quickly.',
};
function friendly(data, status) {
  if (data?.error === 'VALIDATION_ERROR' && data.fields) {
    const first = Object.values(data.fields).flat()[0];
    if (first) return first;
  }
  return MESSAGES[data?.error] || data?.message || `Something went wrong (${status}).`;
}

const qs = (o = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  login: (role, email, password) => request('POST', '/api/auth/login', { role, email, password }),
  register: (name, email, password) => request('POST', '/api/auth/register', { name, email, password, role: 'user' }),
  me: () => request('GET', '/api/auth/me'),
  locations: () => request('GET', '/api/locations'),

  createOrder: (body) => request('POST', '/api/orders', body),
  myOrders: () => request('GET', '/api/orders/mine'),
  activeOrder: () => request('GET', '/api/orders/active'),
  availableOrders: (p) => request('GET', '/api/orders/available' + qs(p)),
  order: (id) => request('GET', `/api/orders/${id}`),
  allOrders: (p) => request('GET', '/api/orders' + qs(p)),
  acceptOrder: (id) => request('PATCH', `/api/orders/${id}/accept`),
  setStatus: (id, status) => request('PATCH', `/api/orders/${id}/status`, { status }),
  setPriority: (id, priority) => request('PATCH', `/api/orders/${id}/priority`, { priority }),

  messages: (orderId, after = 0) => request('GET', `/api/orders/${orderId}/messages${qs({ after })}`),
  sendMessage: (orderId, content) => request('POST', `/api/orders/${orderId}/messages`, { content }),

  riderMe: () => request('GET', '/api/riders/me'),
  setLocation: (lat, lng) => request('PATCH', '/api/riders/me/location', { lat, lng }),
  setAvailability: (is_available) => request('PATCH', '/api/riders/me/availability', { is_available }),
  riders: () => request('GET', '/api/riders'),
  rider: (id) => request('GET', `/api/riders/${id}`),

  users: () => request('GET', '/api/users'),
  user: (id) => request('GET', `/api/users/${id}`),
  stats: () => request('GET', '/api/admin/stats'),
  priorityAnalytics: () => request('GET', '/api/admin/priority-analytics'),
};
