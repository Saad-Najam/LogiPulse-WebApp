const express = require('express');
const db = require('../db');

const router = express.Router();

const stripSecrets = ({ password, ...rest }) => rest;

router.get('/users', (req, res) => {
  const users = db.data.users.map((u) => ({
    ...stripSecrets(u),
    order_count: db.data.orders.filter((o) => o.user_id === u.id).length,
  }));
  res.json(users);
});

router.get('/riders', (req, res) => {
  const riders = db.data.riders.map((r) => {
    const active = db.data.orders.find((o) => o.rider_id === r.id && o.status !== 'DELIVERED');
    return {
      ...stripSecrets(r),
      active_order_id: active ? active.id : null,
      delivered_count: db.data.orders.filter((o) => o.rider_id === r.id && o.status === 'DELIVERED').length,
    };
  });
  res.json(riders);
});

router.get('/riders/:id', (req, res) => {
  const rider = db.data.riders.find((r) => r.id === Number(req.params.id));
  if (!rider) return res.status(404).json({ error: 'Rider not found' });
  res.json(stripSecrets(rider));
});

// Rider updates their own location (manual or browser geolocation).
router.patch('/riders/:id/location', (req, res) => {
  const rider = db.data.riders.find((r) => r.id === Number(req.params.id));
  if (!rider) return res.status(404).json({ error: 'Rider not found' });
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  rider.current_lat = lat;
  rider.current_lng = lng;
  db.save();
  res.json(stripSecrets(rider));
});

router.get('/stats', (req, res) => {
  const o = db.data.orders;
  const count = (fn) => o.filter(fn).length;
  res.json({
    total_orders: o.length,
    pending: count((x) => x.status === 'PENDING'),
    in_progress: count((x) => ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(x.status)),
    delivered: count((x) => x.status === 'DELIVERED'),
    total_riders: db.data.riders.length,
    active_riders: db.data.riders.filter((r) => !r.is_available).length,
    total_users: db.data.users.length,
    priority: {
      NORMAL: count((x) => x.priority === 'NORMAL'),
      HIGH: count((x) => x.priority === 'HIGH'),
      URGENT: count((x) => x.priority === 'URGENT'),
    },
  });
});

module.exports = router;
