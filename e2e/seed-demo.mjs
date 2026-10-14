// Populate a running server with a realistic busy platform (orders in every state, mixed priorities, chat).
import { apiLogin, BASE } from './browser.mjs';
const call = async (m, u, token, body) => { const r = await fetch(BASE + u, { method: m, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: body && JSON.stringify(body) }); return r.json(); };
const users = await Promise.all(['user@logipulse.com', 'bilal@logipulse.com', 'sara@logipulse.com'].map((e) => apiLogin('user', e)));
const riders = await Promise.all(['rider@logipulse.com', 'usman@logipulse.com', 'zain@logipulse.com'].map((e) => apiLogin('rider', e)));
const admin = await apiLogin('admin', 'admin@logipulse.com');
const places = [['Do Darya', 24.7937, 67.0678, 'Bahadurabad Chowrangi'], ['Hyperstar Gulshan', 24.9157, 67.0976, 'DHA Phase 6, Khayaban-e-Rahat'], ['Tariq Road', 24.8725, 67.0583, 'Clifton Block 4'], ['NED University', 24.93, 67.1136, 'Malir Cantt'], ['Aga Khan University Hospital', 24.8918, 67.0753, 'Korangi Industrial Area'], ['Nueplex Cinemas', 24.8329, 67.0629, 'Saddar, Zaibunnisa St'], ['Boat Basin Food Street', 24.8218, 67.0301, 'Gulistan-e-Jauhar Block 15'], ['Karachi Airport (Jinnah Terminal)', 24.9065, 67.1608, 'Bahria Town Karachi']];
const desc = ['Wedding invitations (box of 100)', 'Lab test samples, keep upright', 'Phone repair return', 'Cake, 2 kg, fragile', 'Legal documents, signature required', 'Spare car part', 'Flowers bouquet', 'Prescription medicine'];
const ids = [];
for (let i = 0; i < places.length; i++) {
  const [name, lat, lng, drop] = places[i];
  const o = await call('POST', '/api/orders', users[i % 3].token, { pickup_address: name, pickup_lat: lat, pickup_lng: lng, delivery_address: drop, description: desc[i] });
  ids.push(o.id);
}
// priorities
await call('PATCH', `/api/orders/${ids[1]}/priority`, admin.token, { priority: 'URGENT' });
await call('PATCH', `/api/orders/${ids[4]}/priority`, admin.token, { priority: 'URGENT' });
await call('PATCH', `/api/orders/${ids[3]}/priority`, admin.token, { priority: 'HIGH' });
await call('PATCH', `/api/orders/${ids[6]}/priority`, admin.token, { priority: 'HIGH' });
// riders: usman delivers one fully, zain has one in transit with chat
const deliver = async (rider, id, upto = 3) => { await call('PATCH', `/api/orders/${id}/accept`, rider.token); for (const s of ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].slice(0, upto)) await call('PATCH', `/api/orders/${id}/status`, rider.token, { status: s }); };
await deliver(riders[1], ids[0], 3);
await call('PATCH', `/api/orders/${ids[2]}/accept`, riders[2].token);
await call('PATCH', `/api/orders/${ids[2]}/status`, riders[2].token, { status: 'PICKED_UP' });
await call('PATCH', `/api/orders/${ids[2]}/status`, riders[2].token, { status: 'IN_TRANSIT' });
await call('POST', `/api/orders/${ids[2]}/messages`, users[2 % 3].token, { content: 'Hi! Please call when you reach the gate.' });
await call('POST', `/api/orders/${ids[2]}/messages`, riders[2].token, { content: 'Sure, on my way. ETA 10 minutes.' });
console.log('seeded orders', ids.join(','));
