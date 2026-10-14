import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/stats - overview tiles + last-8-hours order volume (always 8 buckets, zero-filled)
router.get('/stats', asyncHandler(async (req, res) => {
  const [totals, hourly] = await Promise.all([
    query(`
      SELECT
        COUNT(*)::int AS total_orders,
        (COUNT(*) FILTER (WHERE status <> 'DELIVERED'))::int AS active_orders,
        (COUNT(*) FILTER (WHERE status = 'PENDING'))::int AS pending_orders,
        (COUNT(*) FILTER (WHERE status = 'DELIVERED'))::int AS delivered_orders,
        (COUNT(*) FILTER (WHERE status = 'DELIVERED' AND updated_at > NOW() - INTERVAL '24 hours'))::int AS delivered_today,
        (SELECT COUNT(*) FROM riders WHERE is_available = true)::int AS active_riders,
        (SELECT COUNT(*) FROM riders WHERE is_available = false)::int AS busy_riders,
        (SELECT COUNT(*) FROM riders)::int AS total_riders,
        (SELECT COUNT(*) FROM users)::int AS total_users
      FROM orders`),
    query(`
      SELECT h AS hour, COUNT(o.id)::int AS count
      FROM generate_series(date_trunc('hour', NOW()) - INTERVAL '7 hours', date_trunc('hour', NOW()), INTERVAL '1 hour') AS h
      LEFT JOIN orders o ON date_trunc('hour', o.created_at) = h
      GROUP BY h ORDER BY h ASC`),
  ]);
  res.json({ ...totals.rows[0], ordersPerHour: hourly.rows });
}));

// GET /api/admin/priority-analytics - live Normal/High/Urgent counts of undelivered orders (Day 2)
router.get('/priority-analytics', asyncHandler(async (req, res) => {
  const [counts, escalations] = await Promise.all([
    query(`
      SELECT
        (COUNT(*) FILTER (WHERE priority = 'NORMAL'))::int AS normal,
        (COUNT(*) FILTER (WHERE priority = 'HIGH'))::int AS high,
        (COUNT(*) FILTER (WHERE priority = 'URGENT'))::int AS urgent
      FROM orders WHERE status <> 'DELIVERED'`),
    query(`
      SELECT order_id AS "orderId", priority, changed_at
      FROM priority_change_log ORDER BY changed_at DESC, id DESC LIMIT 10`),
  ]);
  res.json({ ...counts.rows[0], recentEscalations: escalations.rows });
}));

export default router;
