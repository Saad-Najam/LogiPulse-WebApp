// Leaflet wrapper (Leaflet is vendored and loaded as a global `L`). Tiles: OpenStreetMap standard layer
// (dark mode = the same tiles, recoloured with a CSS filter in design.css).
// If tiles can't load (offline venue) the map still works: pins + grid background remain.
import { PRIORITY_COLOR, esc } from './ui.js';

export const KARACHI = [24.8607, 67.0011];
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export function createMap(el, { center = KARACHI, zoom = 12, zoomControl = true, interactive = true } = {}) {
  const map = L.map(el, {
    center, zoom, zoomControl: false, attributionControl: true, minZoom: 9, maxZoom: 18,
    scrollWheelZoom: interactive, dragging: interactive, doubleClickZoom: interactive, touchZoom: interactive, boxZoom: false, keyboard: interactive,
  });
  map.attributionControl.setPrefix(false);
  if (zoomControl) L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer(TILE_URL, { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' }).addTo(map);

  const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
  ro.observe(el);

  return {
    map,
    invalidate: () => map.invalidateSize({ animate: false }),
    destroy() { ro.disconnect(); map.remove(); },
  };
}

// Teardrop pin. `label` is short text (distance / id). Colour follows priority.
export function pinIcon({ label = '', priority = 'NORMAL', color, active = false } = {}) {
  const c = color || (priority === 'NORMAL' ? 'var(--accent)' : PRIORITY_COLOR[priority]);
  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div class="pin ${active ? 'is-active' : ''}" data-priority="${priority}" style="--pin:${c}"><div class="head"><span>${esc(label)}</span></div></div>`,
  });
}

export const riderIcon = (you = false) =>
  L.divIcon({ className: '', iconSize: [0, 0], iconAnchor: [0, 0], html: `<div class="rider-dot ${you ? 'you' : ''}"></div>` });

export const flatPin = (cls, color) =>
  L.divIcon({ className: '', iconSize: [0, 0], iconAnchor: [0, 0], html: `<div class="pin ${cls}" style="--pin:${color}"><div class="head"><span></span></div></div>` });

// Smoothly glide a marker to a new position (used for live rider tracking).
export function animateMarker(marker, to, ms = 900) {
  const from = marker.getLatLng();
  if (Math.abs(from.lat - to[0]) < 1e-7 && Math.abs(from.lng - to[1]) < 1e-7) return;
  cancelAnimationFrame(marker._raf);
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    marker.setLatLng([from.lat + (to[0] - from.lat) * e, from.lng + (to[1] - from.lng) * e]);
    if (k < 1) marker._raf = requestAnimationFrame(step);
  };
  marker._raf = requestAnimationFrame(step);
}

export function fitPoints(map, points, { padding = [48, 48], maxZoom = 15, animate = true } = {}) {
  const pts = points.filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (!pts.length) return;
  if (pts.length === 1) { map.setView(pts[0], Math.min(maxZoom, 14), { animate }); return; }
  map.fitBounds(L.latLngBounds(pts), { padding, maxZoom, animate });
}
