import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config.js';
import { dbKind } from './db.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import messageRoutes from './routes/messages.js';
import riderRoutes from './routes/riders.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // behind Render/Vercel proxies: use the real client IP for rate limits

  // 1. Security headers. (Plain-http local dev must not be force-upgraded to https.)
  app.use(helmet(config.isProd ? {} : { contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } } }));
  // 2. CORS: only the configured frontend origin(s). Unset = same-origin only, never a wildcard.
  app.use(cors({
    origin: config.frontendOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  // 3. Small JSON bodies only (blocks payload bombs).
  app.use(express.json({ limit: '16kb' }));
  // 4. Global per-IP throttle.
  app.use('/api', globalLimiter);

  app.get('/api/health', (req, res) => res.json({ ok: true, db: dbKind(), uptime: Math.round(process.uptime()) }));
  app.use('/api/auth', authRoutes);
  app.use('/api/orders/:id/messages', messageRoutes); // before /api/orders so the nested path wins
  app.use('/api/orders', orderRoutes);
  app.use('/api/riders', riderRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', notFound);

  // Frontend (static) is served from the same origin, so one deploy covers app + API + sockets.
  app.use(express.static(path.resolve(import.meta.dirname, '..', 'public')));

  app.use(errorHandler); // must be last
  return app;
}
