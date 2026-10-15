import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { validate, parseId } from '../middleware/validate.js';
import { locationLimiter } from '../middleware/rateLimiter.js';
import { updateRiderLocation } from '../services/riders.js';
import { riderAvailabilityChanged } from '../sockets/events.js';

const router = Router();
router.use(requireAuth);

// GET /api/riders - admin fleet view; busy riders first
router.get('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT r.id, r.name, r.email, r.is_available, r.current_lat, r.current_lng, r.location_updated_at, r.created_at,
           (SELECT COUNT(*) FROM orders o WHERE o.rider_id = r.id AND o.status = 'DELIVERED')::int AS delivery_count,
           ao.id AS active_order_id, ao.pickup_address AS active_pickup_address
    FROM riders r
    LEFT JOIN LATERAL (
      SELECT id, pickup_address FROM orders
      WHERE rider_id = r.id AND status NOT IN ('PENDING','DELIVERED') ORDER BY id DESC LIMIT 1
    ) ao ON true
    ORDER BY r.is_available ASC, r.name ASC`);
  res.json(rows);
}));

// GET /api/riders/me - the rider's own profile: location + availability (drives the toggle and location banner)
router.get('/me', requireRole('rider'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, email, is_available, current_lat, current_lng, location_updated_at FROM riders WHERE id = $1`, [req.user.id],
  );
  if (!rows[0]) throw new AppError('Rider not found', 404, 'RIDER_NOT_FOUND');
  res.json(rows[0]);
}));

// PATCH /api/riders/me/location - /me routes must be declared before /:id
router.patch('/me/location', requireRole('rider'), locationLimiter, validate(z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})), asyncHandler(async (req, res) => {
  const updated = await updateRiderLocation(req.user.id, req.body.lat, req.body.lng);
  if (!updated) throw new AppError('Rider not found', 404, 'RIDER_NOT_FOUND');
  res.json({ ok: true, lat: req.body.lat, lng: req.body.lng, updated_at: updated.location_updated_at });
}));

// PATCH /api/riders/me/availability - manual online/offline toggle
router.patch('/me/availability', requireRole('rider'), validate(z.object({ is_available: z.boolean() })), asyncHandler(async (req, res) => {
  const { is_available } = req.body;
  if (is_available) {
    const { rows } = await query(
      `SELECT 1 FROM orders WHERE rider_id = $1 AND status NOT IN ('PENDING','DELIVERED') LIMIT 1`, [req.user.id],
    );
    if (rows[0]) throw new AppError('Finish your active delivery first', 409, 'RIDER_BUSY');
  }
  await query('UPDATE riders SET is_available = $1 WHERE id = $2', [is_available, req.user.id]);
  riderAvailabilityChanged(req.user.id, is_available);
  res.json({ ok: true, is_available });
}));

// GET /api/riders/:id - admin detail + last 5 orders
router.get('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { rows: [rider] } = await query(
    `SELECT id, name, email, is_available, current_lat, current_lng, location_updated_at, created_at FROM riders WHERE id = $1`, [id],
  );
  if (!rider) throw new AppError('Rider not found', 404, 'RIDER_NOT_FOUND');
  const { rows: recentDeliveries } = await query(
    `SELECT id, pickup_address, delivery_address, status, created_at FROM orders WHERE rider_id = $1 ORDER BY created_at DESC LIMIT 5`, [id],
  );
  res.json({ ...rider, recentDeliveries });
}));

export default router;
