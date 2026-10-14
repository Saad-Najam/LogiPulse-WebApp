import { Server } from 'socket.io';
import { z } from 'zod';
import { query } from '../db.js';
import { config } from '../config.js';
import { verifyToken } from '../middleware/auth.js';
import { canJoinChat, createMessage } from '../services/messages.js';
import { updateRiderLocation } from '../services/riders.js';
import { ROOMS, setIo, createSocketLimiter } from './rooms.js';

const orderRef = z.object({ orderId: z.coerce.number().int().min(1).max(2147483647) });
const sendSchema = orderRef.extend({ content: z.string().trim().min(1).max(1000) });
const locationSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

// Joins the rooms this identity is entitled to. Idempotent, so safe to call from both connect and auth:join.
async function joinRoleRooms(socket) {
  const { id, role } = socket.user;
  socket.join(`${role}:${id}`); // personal room, matches ROOMS.user(id) / ROOMS.rider(id)
  if (role === 'admin') socket.join(ROOMS.admin);
  if (role === 'rider') {
    const { rows } = await query('SELECT is_available FROM riders WHERE id = $1', [id]);
    if (rows[0]?.is_available) socket.join(ROOMS.pool); // only available riders get new-order pushes
  }
}

export function attachSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.frontendOrigins, credentials: true },
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60_000 }, // replay missed events after short drops
  });
  setIo(io);

  // Reject the handshake unless it carries a valid JWT (auth: { token }).
  io.use((socket, next) => {
    try {
      socket.user = verifyToken(socket.handshake.auth?.token ?? '');
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, name } = socket.user;
    const allowMessage = createSocketLimiter(30, 60_000);
    const allowLocation = createSocketLimiter(60, 60_000);

    // Wrap every handler: validate, never throw, answer through the optional ack callback.
    const on = (event, schema, handler) =>
      socket.on(event, async (payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        const parsed = schema.safeParse(payload ?? {});
        if (!parsed.success) return reply({ ok: false, error: 'VALIDATION_ERROR' });
        try {
          reply({ ok: true, ...(await handler(parsed.data)) });
        } catch (err) {
          reply({ ok: false, error: err.code ?? 'INTERNAL_ERROR' });
        }
      });

    joinRoleRooms(socket).catch((err) => console.error('[socket] join failed', err.message));

    on('auth:join', z.any(), async () => {
      await joinRoleRooms(socket);
      socket.emit('auth:joined', { ok: true });
      return {};
    });

    // Unauthorized joins are refused without revealing whether the order exists.
    on('order:join', orderRef, async ({ orderId }) => {
      if (!(await canJoinChat(orderId, { id, role }))) return { ok: false, error: 'FORBIDDEN' };
      socket.join(ROOMS.order(orderId));
      return {};
    });

    on('order:leave', orderRef, async ({ orderId }) => {
      socket.leave(ROOMS.order(orderId));
      return {};
    });

    // Same code path as POST /orders/:id/messages, so the two can't drift apart.
    on('message:send', sendSchema, async ({ orderId, content }) => {
      if (!allowMessage()) return { ok: false, error: 'MESSAGE_RATE_LIMIT' };
      const message = await createMessage(orderId, { id, role, name }, content);
      return { message };
    });

    on('rider:location_update', locationSchema, async ({ lat, lng }) => {
      if (role !== 'rider') return { ok: false, error: 'FORBIDDEN' };
      if (!allowLocation()) return { ok: false, error: 'LOCATION_RATE_LIMIT' };
      await updateRiderLocation(id, lat, lng);
      return {};
    });
  });

  return io;
}
