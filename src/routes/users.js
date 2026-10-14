import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { parseId } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

// password_hash is never selected anywhere in this file.
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT u.id, u.name, u.email, u.created_at, COUNT(o.id)::int AS order_count
    FROM users u LEFT JOIN orders o ON o.user_id = u.id
    GROUP BY u.id ORDER BY u.created_at DESC, u.id DESC`);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { rows: [user] } = await query('SELECT id, name, email, created_at FROM users WHERE id = $1', [id]);
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  const { rows: recentOrders } = await query(
    `SELECT id, pickup_address, delivery_address, status, priority, created_at
     FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3`, [id],
  );
  res.json({ ...user, recentOrders });
}));

export default router;
