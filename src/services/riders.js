import { query } from '../db.js';
import { riderLocationUpdated } from '../sockets/events.js';

// Shared by PATCH /riders/me/location and the rider:location_update socket event.
export async function updateRiderLocation(riderId, lat, lng) {
  const { rows } = await query(
    'UPDATE riders SET current_lat = $1, current_lng = $2, location_updated_at = NOW() WHERE id = $3 RETURNING location_updated_at',
    [lat, lng, riderId],
  );
  if (rows[0]) riderLocationUpdated(riderId, lat, lng, rows[0].location_updated_at);
  return rows[0] ?? null;
}
