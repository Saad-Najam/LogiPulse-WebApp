import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db.js';
import { PRIORITIES, STATUSES, TRANSITIONS, PREVIOUS_STATUS } from '../lib/constants.js';
import { haversineDistance } from '../lib/haversine.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { validate, parseId } from '../middleware/validate.js';
import { createOrderLimiter } from '../middleware/rateLimiter.js';
import { ORDER_SELECT, presentOrder, findOrder, getOrderOr404, assertCanView } from '../services/orders.js';
import * as events from '../sockets/events.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  pickup_address: z.string().trim().min(5).max(300),
  pickup_lat: z.number().min(-90).max(90),
  pickup_lng: z.number().min(-180).max(180),
  delivery_address: z.string().trim().min(5).max(300),
  delivery_lat: z.number().min(-90).max(90).optional(),
  delivery_lng: z.number().min(-180).max(180).optional(),
  description: z.string().trim().max(500).optional(),
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  q: z.string().trim().max(100).optional(),
});

const availableQuery = z.object({
  priority: z.enum(PRIORITIES).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

// POST /api/orders - customer creates a PENDING request (priority starts NORMAL; admins escalate it).
router.post('/', requireRole('user'), createOrderLimiter, validate(createSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const id = await withTransaction(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO orders (user_id, pickup_address, pickup_lat, pickup_lng, delivery_address, delivery_lat, delivery_lng, description, status, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING','NORMAL') RETURNING id`,
      [
        req.user.id,
        b.pickup_address,
        b.pickup_lat,
        b.pickup_lng,
        b.delivery_address,
        b.delivery_lat ?? null,
        b.delivery_lng ?? null,
        b.description ?? null,
      ],
    );
    await db.query(`INSERT INTO order_status_log (order_id, status) VALUES ($1,'PENDING')`, [rows[0].id]);
    return rows[0].id;
  });
  const order = await findOrder(id);
  events.orderNew(order); // after commit, so a pushed order always exists in the DB
  res.status(201).json(order);
}));

// GET /api/orders - admin: paginated, filterable
router.get('/', requireRole('admin'), validate(listQuery, 'query'), asyncHandler(async (req, res) => {
  const { page, limit, status, priority, q } = req.query;
  const where = [];
  const params = [];
  if (status) where.push(`o.status = $${params.push(status)}`);
  if (priority) where.push(`o.priority = $${params.push(priority)}`);
  if (q) {
    const i = params.push(`%${q}%`);
    where.push(`(o.id::text ILIKE $${i} OR o.pickup_address ILIKE $${i} OR o.delivery_address ILIKE $${i} OR u.name ILIKE $${i})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [{ rows }, { rows: [{ total }] }] = await Promise.all([
    query(
      `${ORDER_SELECT} ${whereSql} ORDER BY o.created_at DESC, o.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    ),
    query(`SELECT COUNT(*)::int AS total FROM orders o JOIN users u ON u.id = o.user_id ${whereSql}`, params),
  ]);
  res.json({ orders: rows.map(presentOrder), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

// GET /api/orders/mine - a customer's own orders, or a rider's assigned orders (history incl. delivered)
router.get('/mine', requireRole('user', 'rider'), asyncHandler(async (req, res) => {
  const column = req.user.role === 'user' ? 'o.user_id' : 'o.rider_id';
  const { rows } = await query(`${ORDER_SELECT} WHERE ${column} = $1 ORDER BY o.created_at DESC, o.id DESC`, [req.user.id]);
  res.json(rows.map(presentOrder));
}));

// GET /api/orders/active - the rider's current undelivered order (or null), so "My Active Order" survives a reload
router.get('/active', requireRole('rider'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `${ORDER_SELECT} WHERE o.rider_id = $1 AND o.status <> 'DELIVERED' ORDER BY o.id DESC LIMIT 1`, [req.user.id],
  );
  res.json(rows[0] ? presentOrder(rows[0]) : null);
}));

// GET /api/orders/available - PENDING orders for riders, nearest first.
// distance_km is real Haversine from the rider's location (?lat&lng override, else their stored position).
router.get('/available', requireRole('rider'), validate(availableQuery, 'query'), asyncHandler(async (req, res) => {
  let { lat, lng, priority } = req.query;
  if (lat === undefined || lng === undefined) {
    const { rows } = await query('SELECT current_lat, current_lng FROM riders WHERE id = $1', [req.user.id]);
    lat = rows[0]?.current_lat ?? undefined;
    lng = rows[0]?.current_lng ?? undefined;
  }
  const params = [];
  let sql = `SELECT o.id, o.user_id, u.name AS user_name, o.pickup_address, o.pickup_lat, o.pickup_lng,
                    o.delivery_address, o.description, o.status, o.priority, o.created_at
             FROM orders o JOIN users u ON u.id = o.user_id
             WHERE o.status = 'PENDING' AND o.rider_id IS NULL`;
  if (priority) sql += ` AND o.priority = $${params.push(priority)}`;
  const { rows } = await query(sql, params);

  const located = lat !== undefined && lng !== undefined;
  const orders = rows
    .map((o) => ({
      ...o,
      distance_km: located ? Math.round(haversineDistance(lat, lng, o.pickup_lat, o.pickup_lng) * 100) / 100 : null,
    }))
    .sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity) || b.created_at - a.created_at);
  res.json(orders);
}));

// GET /api/orders/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const order = await getOrderOr404(id);
  assertCanView(order, req.user);
  const { rows: history } = await query(
    'SELECT status, changed_at FROM order_status_log WHERE order_id = $1 ORDER BY changed_at ASC, id ASC', [id],
  );
  res.json({ ...order, statusHistory: history });
}));

// GET /api/orders/:id/status-history
router.get('/:id/status-history', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  assertCanView(await getOrderOr404(id), req.user);
  const { rows } = await query(
    'SELECT status, changed_at FROM order_status_log WHERE order_id = $1 ORDER BY changed_at ASC, id ASC', [id],
  );
  res.json(rows);
}));

// PATCH /api/orders/:id/accept - the race-condition-safe claim.
// The UPDATE only matches while the order is still PENDING and unassigned, so of N simultaneous
// riders exactly one gets a row back; the rest get 409. Rider busy-flag flips in the same transaction.
router.patch('/:id/accept', requireRole('rider'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  await withTransaction(async (db) => {
    const busy = await db.query('UPDATE riders SET is_available = false WHERE id = $1 AND is_available = true RETURNING id', [req.user.id]);
    if (!busy.rows[0]) throw new AppError('Finish your active delivery before accepting another', 409, 'RIDER_BUSY');

    const claimed = await db.query(
      `UPDATE orders SET rider_id = $1, status = 'ACCEPTED', updated_at = NOW()
       WHERE id = $2 AND status = 'PENDING' AND rider_id IS NULL RETURNING id`,
      [req.user.id, id],
    );
    if (!claimed.rows[0]) {
      const exists = await db.query('SELECT 1 FROM orders WHERE id = $1', [id]);
      if (!exists.rows[0]) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
      throw new AppError('Order was already accepted by another rider', 409, 'ORDER_ALREADY_ACCEPTED'); // rolls back is_available
    }
    await db.query(`INSERT INTO order_status_log (order_id, status) VALUES ($1,'ACCEPTED')`, [id]);
  });
  const order = await findOrder(id);
  events.orderAccepted(order);
  res.json(order);
}));

// PATCH /api/orders/:id/status - assigned rider advances ACCEPTED -> PICKED_UP -> IN_TRANSIT -> DELIVERED
router.patch('/:id/status', requireRole('rider'), validate(z.object({ status: z.enum(['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']) })),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { status } = req.body;
    const current = await getOrderOr404(id);
    if (current.rider_id !== req.user.id) throw new AppError('This is not your order', 403, 'FORBIDDEN');
    if (TRANSITIONS[current.status] !== status) {
      throw new AppError(`Cannot move from ${current.status} to ${status}`, 400, 'INVALID_STATUS_TRANSITION');
    }

    const changedAt = await withTransaction(async (db) => {
      // Guarded on the previous status so two concurrent taps can't both apply the same transition.
      const { rows } = await db.query(
        `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND rider_id = $3 AND status = $4 RETURNING updated_at`,
        [status, id, req.user.id, PREVIOUS_STATUS[status]],
      );
      if (!rows[0]) throw new AppError('Order status changed concurrently, refresh and retry', 409, 'CONFLICT');
      await db.query('INSERT INTO order_status_log (order_id, status, changed_at) VALUES ($1,$2,$3)', [id, status, rows[0].updated_at]);
      if (status === 'DELIVERED') await db.query('UPDATE riders SET is_available = true WHERE id = $1', [req.user.id]);
      return rows[0].updated_at;
    });
    const order = await findOrder(id);
    events.orderStatusUpdated(order, changedAt);
    res.json(order);
  }));

// PATCH /api/orders/:id/priority - admin escalation (Day 2), logged for the escalations feed
router.patch('/:id/priority', requireRole('admin'), validate(z.object({ priority: z.enum(PRIORITIES) })), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { priority } = req.body;
  const before = await getOrderOr404(id);
  if (before.priority !== priority) {
    await withTransaction(async (db) => {
      await db.query('UPDATE orders SET priority = $1, updated_at = NOW() WHERE id = $2', [priority, id]);
      await db.query('INSERT INTO priority_change_log (order_id, priority) VALUES ($1,$2)', [id, priority]);
    });
  }
  const order = await findOrder(id);
  if (before.priority !== priority) events.orderPriorityChanged(order);
  res.json(order);
}));

export default router;
