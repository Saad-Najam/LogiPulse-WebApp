# LogiPulse — The Web Forces

## Project Overview
LogiPulse is a courier / last-mile delivery platform with three role-based dashboards (Customer, Rider, Admin) that
share **one data layer**. A customer requests a delivery, the nearest rider accepts it, they chat per order, the rider
walks it through PICKED_UP → IN_TRANSIT → DELIVERED, and an admin watches everything live.

> Status: backend (REST API, WebSockets, database, auth, security) covered by 50 automated tests, plus three role-based
> dashboards built on a custom design system and verified end-to-end through a real browser (`npm run e2e`).

## Tech Stack
- Frontend: vanilla ES modules + a custom CSS design system (no build step), served by the same Node process.
  Leaflet maps (OpenStreetMap tiles), Socket.IO client, self-hosted Inter / Plus Jakarta Sans / JetBrains Mono fonts
- Backend: Node.js 20+, Express 4, Socket.IO 4, Zod validation, JWT (`jsonwebtoken`) + `bcryptjs`
- Security: helmet, CORS allow-list, `express-rate-limit` (5 limiters), 16 KB body cap
- Data layer: PostgreSQL via `pg` when `DATABASE_URL` is set, otherwise embedded Postgres ([PGlite](https://pglite.dev)) — same SQL either way
- Deployment: Render (`render.yaml` blueprint included)

## The three dashboards
| Role | Look & feel | What it does |
|---|---|---|
| **Customer** (cobalt, light) | Calm, guided | Request form with a place picker + tap-to-pin map, live order cards with progress, tracking drawer (live rider marker, status timeline, rider card, per-order chat) |
| **Rider** (emerald, dark-first) | "Dispatch" layout: list + live map | Nearby requests sorted by real distance, priority filters, tap/drag the map to move yourself (distances re-sort instantly), accept, active-delivery view with one-tap status progress, quick-reply chat, success celebration |
| **Admin** (indigo, light) | Operations console | Animated stats, orders-per-hour chart, fleet map, orders table (search, filters, inline priority editor, expandable timeline), riders, users, live priority analytics |

Design system highlights: light/dark themes, role accent colours, distinct status vs priority palettes (amber/red are
reserved for priority), keyed list reconciliation with FLIP reordering (no flicker on live updates), skeleton loaders,
animated steppers/timelines, `prefers-reduced-motion` support, fully responsive down to phones.

## Three Dashboard Architecture
All dashboards talk to the same API and the same Postgres tables, so there is no duplicated state.

```
 User dashboard ─┐                      ┌─ orders / messages / riders / users
 Rider dashboard ─┼─ REST + Socket.IO ─▶ Express ─▶ PostgreSQL
 Admin dashboard ─┘   (JWT per request)  └─ order_status_log / priority_change_log
```

**How an order created by a User reaches a Rider:** `POST /api/orders` inserts the row (+ a status-log row) in a
transaction, then emits `order:new` to the `riders:pool` and `admin:ops` Socket.IO rooms. Clients that don't use sockets
can simply poll `GET /api/orders/available` / `/mine` / `/admin/stats` every 3–5 s — both paths read the same tables.

Socket rooms: `user:{id}`, `rider:{id}`, `riders:pool` (available riders), `admin:ops`, `order:{id}` (chat, joined only
after a party check).

**Race condition (two riders accept the same order):** acceptance is one conditional statement inside a transaction:

```sql
UPDATE orders SET rider_id = $1, status = 'ACCEPTED'
WHERE id = $2 AND status = 'PENDING' AND rider_id IS NULL RETURNING id;
```
Exactly one request gets a row back; the others get `409 ORDER_ALREADY_ACCEPTED` and their rider-busy flag is rolled back.

## Smart Nearby Pickup
Each order stores `pickup_lat/pickup_lng`; each rider stores `current_lat/current_lng` (updated via
`PATCH /api/riders/me/location` or the `rider:location_update` socket event). `GET /api/orders/available` runs the
Haversine formula (`src/lib/haversine.js`) between the rider and every pending order, returns `distance_km`, and sorts
nearest-first. Pass `?lat=&lng=` to compute from any point. The frontend uses the identical function
(`public/js/lib/haversine.js`) so distances update instantly when the rider moves.

```js
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

## Day 2 Priority Feature
`orders.priority` (`NORMAL | HIGH | URGENT`, default `NORMAL`) existed in the schema from Day 1, so Day 2 was additive:
- `PATCH /api/orders/:id/priority` (admin) updates it, writes `priority_change_log`, emits `order:priority_changed`
- `GET /api/orders/available?priority=URGENT` and `GET /api/orders?priority=HIGH` filter for riders / admin
- `GET /api/admin/priority-analytics` → `{ normal, high, urgent, recentEscalations[] }` (undelivered orders only)

## How to Run Locally
```bash
git clone <your-repo-url>
cd logipulse
npm install
npm run dev          # http://localhost:3000  (embedded Postgres, demo data auto-seeded)
npm run e2e          # drives the real UI in 3 browser tabs through the PRD's 9-step demo (needs Chrome; server must be running)
npm test             # ~2 min: API, RBAC, race, chat scoping, sockets, every rate limiter, and the whole API suite again through the real `pg` driver
```
Demo logins (all passwords `password123`): `user@logipulse.com`, `rider@logipulse.com`, `admin@logipulse.com`
(+ `bilal@`/`sara@` customers, `usman@`/`zain@` riders). See `.env.example` for configuration; set `DATABASE_URL` for real Postgres.

---

## API Reference
Auth: `Authorization: Bearer <jwt>` from `POST /api/auth/login`. Errors: `{ error: "SNAKE_CASE", message?, fields? }`.

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{email,password,role}` → `{token,user}`; 10 failures / 15 min / IP |
| POST | `/api/auth/register` | public | role `user` or `rider`; 20 / hour / IP |
| POST | `/api/auth/logout` | any | stateless → `{ok:true}` |
| GET | `/api/auth/me` | any | session rehydrate |
| POST | `/api/orders` | user | creates PENDING / NORMAL; 20 / min |
| GET | `/api/orders` | admin | `?page&limit&status&priority&q` → `{orders,total,page,pages}` |
| GET | `/api/orders/mine` | user / rider | user: own orders; rider: assigned orders incl. delivered |
| GET | `/api/orders/active` | rider | current undelivered order or `null` ("My Active Order" after reload) |
| GET | `/api/orders/available` | rider | pending, `distance_km`, nearest first; `?priority&lat&lng` |
| GET | `/api/orders/:id` | party / admin | includes nested `rider` + `statusHistory` |
| PATCH | `/api/orders/:id/accept` | rider | atomic; 409 `ORDER_ALREADY_ACCEPTED` / `RIDER_BUSY` |
| PATCH | `/api/orders/:id/status` | assigned rider | state machine; 400 `INVALID_STATUS_TRANSITION` |
| PATCH | `/api/orders/:id/priority` | admin | Day 2 |
| GET | `/api/orders/:id/status-history` | party / admin | timeline |
| GET / POST | `/api/orders/:id/messages` | user & rider (admin read) | GET `?after=<id>` for incremental polling; POST 400 `CHAT_NOT_AVAILABLE` until a rider is assigned; 30 / min |
| GET | `/api/riders` | admin | busy first, with active order + delivery count |
| GET | `/api/riders/me` | rider | own location + availability |
| GET | `/api/riders/:id` | admin | + last 5 orders |
| GET | `/api/locations` | public | 16 Karachi landmarks `{name,area,lat,lng}` for the request form |
| PATCH | `/api/riders/me/location` | rider | `{lat,lng}`; 60 / min |
| PATCH | `/api/riders/me/availability` | rider | `{is_available}` |
| GET | `/api/users`, `/api/users/:id` | admin | never returns password hashes |
| GET | `/api/admin/stats` | admin | tiles + 8-hour `ordersPerHour` |
| GET | `/api/admin/priority-analytics` | admin | Day 2 |
| GET | `/api/health` | public | uptime + DB kind |

**Socket events** (connect with `io(url, { auth: { token } })`):
server → client: `order:new`, `order:accepted`, `order:status_updated`, `order:priority_changed`, `message:new`,
`rider:location_updated`, `rider:availability_changed`.
client → server (all take an optional ack): `auth:join`, `order:join`, `order:leave`, `message:send`, `rider:location_update`.

## Judge Q&A cheat-sheet
- **Concurrency** — conditional `UPDATE … WHERE status='PENDING' AND rider_id IS NULL` in a transaction (see above); covered by a test that fires two accepts with `Promise.all`.
- **State propagation** — every write goes to Postgres, then the matching Socket.IO event is emitted; polling the REST endpoints returns the same data.
- **Trust** — `sender_role`, `user_id`, `rider_id` always come from the verified JWT, never the request body (a test forges `sender_role` and it is ignored).
- **10,000 riders** — replace polling with socket push (already supported), add PostGIS + GiST index and `ST_DWithin` instead of scanning pending orders in Node, move rate-limit state to Redis, queue assignment.

## Supabase quick start
```bash
# 1. paste the Session-pooler URI into DATABASE_URL in .env (SSL is auto-enabled for supabase hosts)
npm run db:check          # connects, shows host/user/TLS, tables, row counts and RLS status; explains common mistakes
npm run db:setup          # create tables + demo data (the server also does this on boot)
npm run db:reset -- --yes # wipe + re-seed (demo reset before judging)
npm run dev
```
Connection problems (wrong password, IPv6-only direct URL, missing `postgres.<ref>` username, paused project…) are reported
with a plain-language fix instead of a raw driver error.

## Deploying with Supabase + Render
1. Supabase: create a project, then **Connect → Session pooler** and copy the URI (the direct connection is IPv6-only and won't work from Render's free tier).
2. Render: New → Blueprint (uses `render.yaml`) or New → Web Service. Set `DATABASE_URL` = the pooler URI, `DATABASE_SSL=true`; `JWT_SECRET` is generated for you. Optionally `DATABASE_POOL_MAX` (default 10).
3. Tables, indexes and demo data are created on first boot. Row-level security is enabled on every table so Supabase's public REST API cannot read them; the server connects as `postgres`, which bypasses RLS.
4. **Latency:** pick the Render region closest to your Supabase region (the `webforces` project is in Tokyo / `ap-northeast-1` -> choose **Singapore**). Each API call makes a DB round trip, so a far-away region makes the app feel slow.
5. Demo reset (SQL editor): `TRUNCATE messages, order_status_log, priority_change_log, orders, users, riders, admins RESTART IDENTITY CASCADE;` then restart the service to re-seed.
