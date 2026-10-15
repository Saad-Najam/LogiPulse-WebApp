import { query } from '../db.js';
import { AppError } from '../middleware/errorHandler.js';

export const ORDER_SELECT = `
  SELECT o.*, u.name AS user_name, r.name AS rider_name,
         r.current_lat AS rider_lat, r.current_lng AS rider_lng, r.location_updated_at AS rider_location_at
  FROM orders o
  JOIN users u ON u.id = o.user_id
  LEFT JOIN riders r ON r.id = o.rider_id`;

// Adds a nested `rider` object (null until accepted) next to the flat fields.
// A rider's live position is only shared while the delivery is in progress (never before accept, never after delivery).
export const presentOrder = (row) => {
  const tracking = row.rider_id && row.status !== 'DELIVERED';
  return {
    ...row,
    rider: row.rider_id ? { id: row.rider_id, name: row.rider_name } : null,
    rider_lat: tracking ? row.rider_lat : null,
    rider_lng: tracking ? row.rider_lng : null,
    rider_location_at: tracking ? row.rider_location_at : null,
  };
};

export async function findOrder(id, db = { query }) {
  const { rows } = await db.query(`${ORDER_SELECT} WHERE o.id = $1`, [id]);
  return rows[0] ? presentOrder(rows[0]) : null;
}

export async function getOrderOr404(id) {
  const order = await findOrder(id);
  if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  return order;
}

// users see their own orders, riders their assigned ones, admins everything.
export function canView(order, user) {
  if (user.role === 'admin') return true;
  if (user.role === 'user') return order.user_id === user.id;
  if (user.role === 'rider') return order.rider_id === user.id;
  return false;
}

export function assertCanView(order, user) {
  if (!canView(order, user)) throw new AppError('You do not have access to this order', 403, 'FORBIDDEN');
}
