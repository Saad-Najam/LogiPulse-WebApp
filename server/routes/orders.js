const express = require('express');
const db = require('../db');
const { PRIORITIES, NEXT_STATUS } = require('../lib/constants');

const router = express.Router();

// Join user/rider names onto an order so clients never need a second lookup.
function present(o) {
  const user = db.data.users.find((u) => u.id === o.user_id);
  const rider = o.rider_id ? db.data.riders.find((r) => r.id === o.rider_id) : null;
  return { ...o, user_name: user ? user.name : 'Unknown', rider_name: rider ? rider.name : null };
}

function findOrder(req, res) {
  const order = db.data.orders.find((o) => o.id === Number(req.params.id));
  if (!order) res.status(404).json({ error: 'Order not found' });
  return order;
}

// GET /api/orders?userId=&riderId=&status=&priority=
router.get('/', (req, res) => {
  const { userId, riderId, status, priority } = req.query;
  let list = db.data.orders;
  if (userId) list = list.filter((o) => o.user_id === Number(userId));
  if (riderId) list = list.filter((o) => o.rider_id === Number(riderId));
  if (status) list = list.filter((o) => o.status === status);
  if (priority) list = list.filter((o) => o.priority === priority);
  res.json(list.map(present).sort((a, b) => b.id - a.id));
});

router.get('/:id', (req, res) => {
  const order = findOrder(req, res);
  if (order) res.json(present(order));
});

router.post('/', (req, res) => {
  const b = req.body || {};
  const user = db.data.users.find((u) => u.id === Number(b.user_id));
  if (!user) return res.status(400).json({ error: 'Unknown user' });

  const lat = Number(b.pickup_lat);
  const lng = Number(b.pickup_lng);
  if (!b.pickup_address || !b.delivery_address || !b.description) {
    return res.status(400).json({ error: 'Pickup address, delivery address and description are required' });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'Valid pickup coordinates are required' });
  }
  const priority = b.priority || 'NORMAL';
  if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

  const ts = db.now();
  const order = {
    id: db.nextId('orders'),
    user_id: user.id,
    rider_id: null,
    pickup_address: String(b.pickup_address).trim(),
    pickup_lat: lat,
    pickup_lng: lng,
    delivery_address: String(b.delivery_address).trim(),
    description: String(b.description).trim(),
    status: 'PENDING',
    priority,
    created_at: ts,
    updated_at: ts,
    history: [{ status: 'PENDING', at: ts }],
  };
  db.data.orders.push(order);
  db.save();
  res.status(201).json(present(order));
});

// Atomic accept: the PENDING check and the assignment happen in one synchronous
// block, so if two riders race, the second sees status !== PENDING and gets 409.
router.post('/:id/accept', (req, res) => {
  const order = findOrder(req, res);
  if (!order) return;
  const rider = db.data.riders.find((r) => r.id === Number(req.body?.rider_id));
  if (!rider) return res.status(400).json({ error: 'Unknown rider' });
  if (order.status !== 'PENDING' || order.rider_id) {
    return res.status(409).json({ error: 'Order was already accepted by another rider' });
  }
  if (!rider.is_available) {
    return res.status(409).json({ error: 'Finish your active delivery before accepting another' });
  }

  const ts = db.now();
  order.status = 'ACCEPTED';
  order.rider_id = rider.id;
  order.updated_at = ts;
  order.history.push({ status: 'ACCEPTED', at: ts });
  rider.is_available = false;
  db.save();
  res.json(present(order));
});

// Advance status along the state machine (assigned rider only).
router.post('/:id/status', (req, res) => {
  const order = findOrder(req, res);
  if (!order) return;
  const { rider_id, status } = req.body || {};
  if (order.rider_id !== Number(rider_id)) return res.status(403).json({ error: 'Not your order' });
  if (NEXT_STATUS[order.status] !== status) {
    return res.status(400).json({ error: `Cannot move from ${order.status} to ${status}` });
  }

  const ts = db.now();
  order.status = status;
  order.updated_at = ts;
  order.history.push({ status, at: ts });
  if (status === 'DELIVERED') {
    const rider = db.data.riders.find((r) => r.id === order.rider_id);
    if (rider) rider.is_available = true;
  }
  db.save();
  res.json(present(order));
});

// Admin can re-prioritise an order (Day 2).
router.patch('/:id/priority', (req, res) => {
  const order = findOrder(req, res);
  if (!order) return;
  const { priority } = req.body || {};
  if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
  order.priority = priority;
  order.updated_at = db.now();
  db.save();
  res.json(present(order));
});

module.exports = router;
module.exports.present = present;
