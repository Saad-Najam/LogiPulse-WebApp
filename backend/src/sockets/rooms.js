// Socket.IO instance holder + room naming. Kept separate so routes can emit without importing the server (no cycles).
let io = null;
export const setIo = (instance) => { io = instance; };
export const getIo = () => io;

export const ROOMS = {
  user: (id) => `user:${id}`,
  rider: (id) => `rider:${id}`,
  admin: 'admin:ops',
  pool: 'riders:pool', // available riders - receive new orders
  order: (id) => `order:${id}`, // chat scope
};

// Keep a rider's sockets in/out of the pool as availability changes (accept, deliver, manual toggle).
export function syncRiderPool(riderId, available) {
  if (!io) return;
  const sockets = io.in(ROOMS.rider(riderId));
  if (available) sockets.socketsJoin(ROOMS.pool);
  else sockets.socketsLeave(ROOMS.pool);
}

// Sliding-window limiter for socket events (30 msgs/min etc). One instance per socket.
export function createSocketLimiter(max, windowMs) {
  let hits = [];
  return () => {
    const now = Date.now();
    hits = hits.filter((t) => now - t < windowMs);
    if (hits.length >= max) return false;
    hits.push(now);
    return true;
  };
}
