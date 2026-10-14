import { query } from '../db.js';
import { AppError } from '../middleware/errorHandler.js';
import { messageNew } from '../sockets/events.js';

async function loadParties(orderId) {
  const { rows } = await query('SELECT id, user_id, rider_id FROM orders WHERE id = $1', [orderId]);
  if (!rows[0]) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  return rows[0];
}

const isParty = (order, { role, id }) =>
  role === 'admin' || (role === 'user' && order.user_id === id) || (role === 'rider' && order.rider_id === id);

// Is this user allowed in this order's chat room? (used by REST + socket order:join)
export async function canJoinChat(orderId, user) {
  const { rows } = await query('SELECT user_id, rider_id FROM orders WHERE id = $1', [orderId]);
  return !!rows[0] && isParty(rows[0], user);
}

export async function listMessages(orderId, user) {
  const order = await loadParties(orderId);
  if (!isParty(order, user)) throw new AppError('Not a party to this order', 403, 'FORBIDDEN');
  const { rows } = await query(
    `SELECT m.id, m.order_id, m.content, m.sender_role, m.sender_id, m.created_at,
            CASE WHEN m.sender_role = 'user' THEN u.name ELSE r.name END AS sender_name
     FROM messages m
     LEFT JOIN users u  ON u.id = m.sender_id AND m.sender_role = 'user'
     LEFT JOIN riders r ON r.id = m.sender_id AND m.sender_role = 'rider'
     WHERE m.order_id = $1
     ORDER BY m.created_at ASC, m.id ASC`,
    [orderId],
  );
  return rows;
}

// sender_role / sender_id come from the verified token, never from client input.
export async function createMessage(orderId, user, content) {
  if (user.role !== 'user' && user.role !== 'rider') throw new AppError('Only the customer or rider can chat', 403, 'FORBIDDEN');
  const order = await loadParties(orderId);
  if (!isParty(order, user)) throw new AppError('Not a party to this order', 403, 'FORBIDDEN');
  if (!order.rider_id) throw new AppError('No rider assigned yet', 400, 'CHAT_NOT_AVAILABLE');

  const { rows } = await query(
    `INSERT INTO messages (order_id, sender_role, sender_id, content)
     VALUES ($1,$2,$3,$4)
     RETURNING id, order_id, content, sender_role, sender_id, created_at`,
    [orderId, user.role, user.id, content],
  );
  const message = { ...rows[0], sender_name: user.name };
  messageNew(message);
  return message;
}
