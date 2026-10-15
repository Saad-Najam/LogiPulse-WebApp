# LogiPulse — Real-Time Delivery Management Platform

A full-stack logistics platform built with **Express + Socket.IO + PostgreSQL** (backend) and **React 18 + Vite + TypeScript + Tailwind CSS** (frontend).

---

## Repository Structure

```
/
├─ backend/     → Express API server (deploys to Railway)
├─ frontend/    → React SPA (deploys to Vercel)
├─ data/        → Local PGlite data directory (git-ignored)
└─ README.md
```

---

## Local Development

### Prerequisites
- Node.js ≥ 20.12
- npm ≥ 10

### 1. Backend

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET etc.
npm install
npm run dev            # starts on http://localhost:3000
```

**Backend env vars** (see `backend/.env.example`):

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` or `production` |
| `JWT_SECRET` | Long random secret string |
| `DATABASE_URL` | Supabase Session Pooler URI |
| `DATABASE_SSL` | `true` for Supabase/Railway |
| `FRONTEND_URL` | Comma-separated allowed origins (e.g. `http://localhost:5173`) |
| `SEED_DEMO_DATA` | `true` to seed demo users/orders on boot |
| `PORT` | Provided by Railway automatically — do NOT set manually |

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local   # set VITE_API_URL for production, leave empty for local dev
npm install
npm run dev                  # starts on http://localhost:5173
```

> For local dev, `VITE_API_URL` should be **empty** — Vite proxies `/api` and `/socket.io` to `localhost:3000` automatically.

---

## Deployment

### Backend → Railway

1. Connect your GitHub repo to Railway
2. Set **Root Directory** to `backend`
3. Railway auto-detects Node.js via Nixpacks
4. Add environment variables (see table above)
5. Set `FRONTEND_URL` to your Vercel URL (e.g. `https://logipulse.vercel.app`)

### Frontend → Vercel

1. Connect your GitHub repo to Vercel
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add env var: `VITE_API_URL=https://your-backend.up.railway.app`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Express 4, Socket.IO 4, pg / PGlite |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Database | PostgreSQL (Supabase) / PGlite (local) |
| Frontend | React 18, Vite 6, TypeScript 5, Tailwind CSS 3 |
| Maps | Leaflet + OpenStreetMap tiles (proxied) |
| Routing | OSRM public API |
| Deployment | Railway (API) + Vercel (SPA) |
