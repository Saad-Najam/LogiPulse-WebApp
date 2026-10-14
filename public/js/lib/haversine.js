// Smart Nearby Pickup: real great-circle distance (km) from lat/lng pairs.
// Identical maths to src/lib/haversine.js - the rider screen recomputes instantly when the rider moves.
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Attach `distance_km` from the rider to every order's pickup point, nearest first.
export function withDistance(orders, riderLat, riderLng) {
  return orders
    .map((o) => ({ ...o, distance_km: haversineDistance(riderLat, riderLng, o.pickup_lat, o.pickup_lng) }))
    .sort((a, b) => a.distance_km - b.distance_km);
}
