const express = require('express');
const db = require('../db');

const router = express.Router({ mergeParams: true });

function loadOrder(req, res) {
  const order = db.data.orders.find((o) => o.id === Number(req.params.id));
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return null;
  }
  return order;
}

// Chat is per-order and only exists once a rider is assigned.
function authorise(order, role, id, res) {
  if (!order.rider_id) {
    res.status(409).json({ error: 'Chat opens once a rider accepts this order' });
    return false;
  }
  const ok = (role === 'user' && order.user_id === Number(id)) || (role === 'rider' && order.rider_id === Number(id));
  if (!ok) res.status(403).json({ error: 'You are not part of this order' });
  return ok;
}

function senderName(role, id) {
  const table = role === 'user' ? db.data.users : db.data.riders;
  return (table.find((p) => p.id === id) || {}).name || role;
}

router.get('/', (req, res) => {
  const order = loadOrder(req, res);
  if (!order || !authorise(order, req.query.role, req.query.id, res)) return;
  const msgs = db.data.messages
    .filter((m) => m.order_id === order.id)
    .map((m) => ({ ...m, sender_name: senderName(m.sender_role, m.sender_id) }));
  res.json(msgs);
});

router.post('/', (req, res) => {
  const order = loadOrder(req, res);
  const { role, id, content } = req.body || {};
  if (!order || !authorise(order, role, id, res)) return;
  const text = String(content || '').trim();
  if (!text) return res.status(400).json({ error: 'Message is empty' });

  const msg = {
    id: db.nextId('messages'),
    order_id: order.id,
    sender_role: role,
    sender_id: Number(id),
    content: text.slice(0, 1000),
    created_at: db.now(),
  };
  db.data.messages.push(msg);
  db.save();
  res.status(201).json({ ...msg, sender_name: senderName(role, msg.sender_id) });
});

module.exports = router;
