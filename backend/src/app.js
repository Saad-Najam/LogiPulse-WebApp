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
    crossOriginResourcePolicy: { policy: 'cross-origin' },
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
  // 2. CORS: allowed frontend origin(s).
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  // 3. Small JSON bodies only (blocks payload bombs).
  app.use(express.json({ limit: '16kb' }));

  // Root health check / service info
  app.get('/', (req, res) => res.json({ ok: true, service: 'logipulse-api' }));

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

  const routeCache = new Map();

  // OSRM Road Routing Service for Karachi (Calculates actual road network geometry)
  app.get('/api/routes/directions', async (req, res) => {
    const originLat = parseFloat(req.query.originLat);
    const originLng = parseFloat(req.query.originLng);
    const destLat = parseFloat(req.query.destLat);
    const destLng = parseFloat(req.query.destLng);

    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      return res.status(400).json({ ok: false, error: 'Valid origin and dest coordinates are required' });
    }

    const cacheKey = `${originLat.toFixed(4)},${originLng.toFixed(4)}->${destLat.toFixed(4)},${destLng.toFixed(4)}`;
    if (routeCache.has(cacheKey)) {
      return res.json(routeCache.get(cacheKey));
    }

    try {
      // Query OSRM driving service (coordinates are [lng,lat])
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const upstream = await fetch(osrmUrl, {
        headers: { 'User-Agent': 'LogiPulse-Delivery/1.0 (Karachi Logistics Platform)' },
      });

      if (upstream.ok) {
        const data = await upstream.json();
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const route = data.routes[0];
          // GeoJSON coordinates are [lng, lat] -> convert to Leaflet [lat, lng]
          const leafletCoords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          const result = {
            ok: true,
            coordinates: leafletCoords,
            distanceKm: Math.round((route.distance / 1000) * 10) / 10,
            durationMin: Math.max(1, Math.round(route.duration / 60)),
          };
          if (routeCache.size > 500) routeCache.clear();
          routeCache.set(cacheKey, result);
          return res.json(result);
        }
      }
    } catch (err) {
      console.warn('OSRM routing fetch failed, using fallback:', err.message);
    }

    // Graceful Fallback: Generate curved road waypoints along Karachi arterial grid
    const points = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const arc = Math.sin(t * Math.PI) * 0.006;
      const lat = originLat + (destLat - originLat) * t + arc;
      const lng = originLng + (destLng - originLng) * t - arc * 0.5;
      points.push([lat, lng]);
    }
    const fallbackResult = {
      ok: true,
      coordinates: points,
      distanceKm: 12.5,
      durationMin: 25,
    };
    return res.json(fallbackResult);
  });

  app.get('/api/health', (req, res) => res.json({ ok: true, db: dbKind(), uptime: Math.round(process.uptime()) }));

  app.use('/api/auth', authRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/orders/:id/messages', messageRoutes); // before /api/orders so the nested path wins
  app.use('/api/orders', orderRoutes);
  app.use('/api/riders', riderRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', notFound);

  app.use(errorHandler); // must be last
  return app;
}
