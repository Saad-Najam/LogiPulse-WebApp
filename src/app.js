import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config.js';
import { dbKind } from './db.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import locationRoutes from './routes/locations.js';
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
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'https://*.tile.openstreetmap.org',
          'https://tile.openstreetmap.org',
          'https://*.tile.openstreetmap.fr',
          'https://*.basemaps.cartocdn.com',
          'https://basemaps.cartocdn.com',
        ],
        ...(config.isProd ? {} : { 'upgrade-insecure-requests': null }),
      },
    },
  }));
  // 2. CORS: only the configured frontend origin(s). Unset = same-origin only, never a wildcard.
  app.use(cors({
    origin: config.frontendOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  // 3. Small JSON bodies only (blocks payload bombs).
  app.use(express.json({ limit: '16kb' }));
  // In-memory tile cache: ensures high-speed map panning without duplicate requests or rate limit burn
  const tileCache = new Map();
  const MAX_TILES = 1500;

  // OpenStreetMap Tile Service (Zero API keys required, zero watermarks, 100% compliant)
  app.get('/api/tiles/:z/:x/:y.png', async (req, res) => {
    const { z, x, y } = req.params;
    const key = `${z}/${x}/${y}`;

    if (tileCache.has(key)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.send(tileCache.get(key));
    }

    try {
      // Primary: Official OSM with authorized user-agent
      let upstream = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
        headers: {
          'User-Agent': 'LogiPulse-Delivery/1.0 (Karachi Logistics Platform; contact@logipulse.local)',
          'Referer': 'https://logipulse.local',
        },
      });

      // Secondary fallback: OSM France
      if (!upstream.ok) {
        upstream = await fetch(`https://tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png`, {
          headers: {
            'User-Agent': 'LogiPulse-Delivery/1.0 (Karachi Logistics Platform; contact@logipulse.local)',
          },
        });
      }

      if (!upstream.ok) {
        return res.status(upstream.status).end();
      }

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      const arrayBuf = await upstream.arrayBuffer();
      const buf = Buffer.from(arrayBuf);

      if (tileCache.size >= MAX_TILES) {
        const firstKey = tileCache.keys().next().value;
        tileCache.delete(firstKey);
      }
      tileCache.set(key, buf);

      res.send(buf);
    } catch {
      res.status(502).end();
    }
  });

  // 4. Global per-IP throttle for API data routes.
  app.use('/api', globalLimiter);
  app.use('/api', requestLogger);

  app.get('/api/health', (req, res) => res.json({ ok: true, db: dbKind(), uptime: Math.round(process.uptime()) }));

  app.use('/api/auth', authRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/orders/:id/messages', messageRoutes); // before /api/orders so the nested path wins
  app.use('/api/orders', orderRoutes);
  app.use('/api/riders', riderRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', notFound);

  // Frontend (static) is served from the same origin, so one deploy covers app + API + sockets.
  app.use(express.static(path.resolve(import.meta.dirname, '..', 'public')));

  // SPA fallback: any non-API route serves index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.resolve(import.meta.dirname, '..', 'public', 'index.html'));
  });

  app.use(errorHandler); // must be last
  return app;
}
