import { Router } from 'express';
import { LOCATIONS } from '../lib/locations.js';

const router = Router();

// Public, static: list of predefined landmarks
router.get('/', (req, res) => res.json(LOCATIONS));

// Address search / Autocomplete endpoint (Google Places style)
router.get('/search', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.json(LOCATIONS.slice(0, 8).map(l => ({
      name: l.name,
      displayName: `${l.name}, ${l.area}, Karachi`,
      lat: l.lat,
      lng: l.lng,
      source: 'preset',
    })));
  }

  // Local landmark matches
  const localMatches = LOCATIONS.filter(l =>
    l.name.toLowerCase().includes(query.toLowerCase()) ||
    l.area.toLowerCase().includes(query.toLowerCase())
  ).map(l => ({
    name: l.name,
    displayName: `${l.name}, ${l.area}, Karachi`,
    lat: l.lat,
    lng: l.lng,
    source: 'preset',
  }));

  try {
    const upstreamUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Karachi, Pakistan')}&addressdetails=1&countrycodes=pk&limit=6`;
    const upstream = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': 'LogiPulse-Delivery/1.0 (Karachi Logistics Platform; contact@logipulse.local)',
      },
    });
    if (upstream.ok) {
      const results = await upstream.json();
      const nominatimMatches = results.map(r => {
        const parts = r.display_name.split(',').map(s => s.trim());
        const primary = parts[0];
        const secondary = parts.slice(1, 4).join(', ');
        return {
          name: primary,
          displayName: secondary ? `${primary}, ${secondary}` : r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          source: 'osm',
        };
      });

      return res.json([...localMatches, ...nominatimMatches].slice(0, 8));
    }
  } catch {
    // fallback to local matches
  }

  res.json(localMatches);
});

// Reverse geocoding endpoint: coordinates -> address
router.get('/reverse', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng required' });
  }

  try {
    const upstreamUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const upstream = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': 'LogiPulse-Delivery/1.0 (Karachi Logistics Platform; contact@logipulse.local)',
      },
    });

    if (upstream.ok) {
      const data = await upstream.json();
      const addr = data.address || {};
      const road = addr.road || addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || '';
      const city = addr.city || addr.town || 'Karachi';
      const cleanName = [road, city].filter(Boolean).join(', ') || data.display_name.split(',').slice(0, 3).join(', ');

      return res.json({
        name: cleanName || 'Selected Location',
        displayName: data.display_name,
        lat,
        lng,
      });
    }
  } catch {}

  // Fallback: find nearest Karachi landmark
  let closest = LOCATIONS[0];
  let minDistance = Infinity;
  for (const loc of LOCATIONS) {
    const d = Math.hypot(loc.lat - lat, loc.lng - lng);
    if (d < minDistance) {
      minDistance = d;
      closest = loc;
    }
  }

  res.json({
    name: `Near ${closest.name}, ${closest.area}`,
    displayName: `${closest.name}, ${closest.area}, Karachi`,
    lat,
    lng,
  });
});

export default router;
