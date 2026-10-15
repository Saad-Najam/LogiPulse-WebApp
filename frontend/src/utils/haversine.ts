/**
 * Haversine Formula for exact geographic distance calculation
 * Earth radius R = 6371 km
 * Formula strictly adheres to PRD Page 7 specification.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}

export function estimateTimeMinutes(km: number): string {
  // Average city courier speed ~20 km/h plus 5 min baseline
  const minutes = Math.max(5, Math.round((km / 22) * 60 + 4))
  return `~${minutes} min`
}

// Predefined verified coordinates for Karachi zones
export const KARACHI_LOCATIONS = [
  { name: 'Gulshan-e-Iqbal Block 13', lat: 24.9207, lng: 67.0982 },
  { name: 'Block 6, PECHS, Karachi', lat: 24.8615, lng: 67.0699 },
  { name: 'Dolmen Mall, Clifton', lat: 24.8138, lng: 67.0305 },
  { name: 'Khayaban-e-Shahbaz, DHA Phase 6', lat: 24.7936, lng: 67.0612 },
  { name: 'Bahadurabad Chowrangi', lat: 24.8825, lng: 67.0673 },
  { name: 'I.I. Chundrigar Road (Financial Dist)', lat: 24.8512, lng: 67.0091 },
  { name: 'Saddar Electronics Market', lat: 24.8576, lng: 67.0289 },
  { name: 'North Nazimabad Block H', lat: 24.9421, lng: 67.0423 },
]

