// Server -> client emit helpers. REST handlers call these AFTER the DB write succeeds.
// All are no-ops when Socket.IO isn't attached (e.g. unit tests of routes), so polling clients keep working.
import { getIo, ROOMS, syncRiderPool } from './rooms.js';

const emit = (rooms, event, payload) => {
  const io = getIo();
  if (!io) return;
  let target = io;
  for (const room of rooms) target = target.to(room);
  target.emit(event, payload);
};

export const orderNew = (order) => emit([ROOMS.pool, ROOMS.admin], 'order:new', order);

export function orderAccepted(order) {
  const rider = { id: order.rider_id, name: order.rider_name };
  emit([ROOMS.user(order.user_id)], 'order:accepted', { orderId: order.id, status: order.status, rider });
  emit([ROOMS.pool, ROOMS.admin], 'order:accepted', { orderId: order.id, status: order.status });
  riderAvailabilityChanged(order.rider_id, false);
}

export function orderStatusUpdated(order, changedAt) {
  emit([ROOMS.user(order.user_id), ROOMS.admin], 'order:status_updated', {
    orderId: order.id, status: order.status, changed_at: changedAt,
  });
  if (order.status === 'DELIVERED') riderAvailabilityChanged(order.rider_id, true);
}

export function orderPriorityChanged(order) {
  const rooms = [ROOMS.admin, ROOMS.user(order.user_id)];
  if (order.rider_id) rooms.push(ROOMS.rider(order.rider_id));
  if (order.status === 'PENDING') rooms.push(ROOMS.pool);
  emit(rooms, 'order:priority_changed', { orderId: order.id, priority: order.priority });
}

export const messageNew = (message) => emit([ROOMS.order(message.order_id)], 'message:new', message);

export const riderLocationUpdated = (riderId, lat, lng, updatedAt) =>
  emit([ROOMS.admin], 'rider:location_updated', { riderId, lat, lng, updated_at: updatedAt });

export function riderAvailabilityChanged(riderId, isAvailable) {
  syncRiderPool(riderId, isAvailable);
  emit([ROOMS.admin], 'rider:availability_changed', { riderId, is_available: isAvailable });
}
