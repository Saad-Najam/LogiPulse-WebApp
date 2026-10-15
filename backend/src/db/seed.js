// Demo data around Karachi so Haversine distances look realistic. Runs only on an empty database.
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { config } from '../config.js';

export const DEMO_PASSWORD = 'password123';

const USERS = [
  ['Ayesha Khan', 'user@logipulse.com'],
  ['Bilal Ahmed', 'bilal@logipulse.com'],
  ['Sara Malik', 'sara@logipulse.com'],
];
const RIDERS = [
  ['Hamza Ali', 'rider@logipulse.com', 24.8607, 67.0011],
  ['Usman Tariq', 'usman@logipulse.com', 24.9056, 67.0822],
  ['Zain Raza', 'zain@logipulse.com', 24.8138, 67.0299],
];
// [user#, pickup, lat, lng, delivery, description, priority, minutes ago]
const ORDERS = [
  [1, 'Dolmen Mall Clifton', 24.8002, 67.0305, 'Gulshan-e-Iqbal Block 13', 'Documents envelope', 'NORMAL', 40],
  [2, 'Saddar Empress Market', 24.8556, 67.0225, 'PECHS Block 2', 'Gift box (fragile)', 'HIGH', 30],
  [3, 'Port Grand', 24.8416, 66.9987, 'Defence Phase 5', 'Medicine parcel', 'URGENT', 22],
  [1, 'Karachi University', 24.9419, 67.1228, 'North Nazimabad Block H', 'Laptop bag', 'NORMAL', 15],
  [2, 'Lucky One Mall', 24.9302, 67.0998, 'Nazimabad No. 1', 'Groceries', 'NORMAL', 8],
];

export async function seedIfEmpty() {
  if (!config.seedDemoData) return false;
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM users');
  if (rows[0].n > 0) return false;

  const hash = await bcrypt.hash(DEMO_PASSWORD, config.bcryptRounds);
  await withTransaction(async (db) => {
    await db.query('INSERT INTO admins (name, email, password_hash) VALUES ($1,$2,$3)', [
      'Operations Admin', 'admin@logipulse.com', hash,
    ]);
    for (const [name, email] of USERS) {
      await db.query('INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3)', [name, email, hash]);
    }
    for (const [name, email, lat, lng] of RIDERS) {
      await db.query(
        'INSERT INTO riders (name, email, password_hash, current_lat, current_lng, location_updated_at) VALUES ($1,$2,$3,$4,$5,NOW())',
        [name, email, hash, lat, lng],
      );
    }
    for (const [u, pickup, lat, lng, drop, desc, priority, mins] of ORDERS) {
      const ts = new Date(Date.now() - mins * 60000);
      const { rows: [o] } = await db.query(
        `INSERT INTO orders (user_id, pickup_address, pickup_lat, pickup_lng, delivery_address, description, priority, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING id`,
        [u, pickup, lat, lng, drop, desc, priority, ts],
      );
      await db.query(`INSERT INTO order_status_log (order_id, status, changed_at) VALUES ($1,'PENDING',$2)`, [o.id, ts]);
    }
  });
  return true;
}
