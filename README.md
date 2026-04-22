# WiFi Portal - Captive Portal SaaS

A full-stack WiFi captive portal with admin panel. Built with React + Vite + TypeScript (frontend) and Express + Node.js + SQLite (backend).

## Quick Start (Local)

```bash
# 1. Clone and install all dependencies
cd wifi-portal
npm run install:all

# 2. Copy environment file
cp .env.example .env
# Edit .env and change JWT_SECRET to something random

# 3. Start dev servers (frontend + backend concurrently)
npm run dev
```

- Portal: http://localhost:5173/portal
- Admin: http://localhost:5173/admin (password: `admin123`)

## Project Structure

```
wifi-portal/
├── frontend/          # React + Vite + TypeScript
│   └── src/
│       ├── pages/
│       │   ├── Portal.tsx    # Public captive portal page
│       │   └── Admin.tsx     # Protected admin panel
│       └── main.tsx
├── backend/
│   ├── server.ts      # Express API
│   ├── db.ts          # SQLite database setup
│   └── uploads/       # Uploaded images (gitignored)
└── package.json
```

## Deploy to Railway

1. Push your repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set environment variables:
   ```
   JWT_SECRET=your-very-long-random-secret-here
   NODE_ENV=production
   PORT=3000
   ```
4. Railway auto-detects Node.js and runs the build
5. Your portal will be live at `something.railway.app`

**Build command:** `npm run install:all && npm run build`  
**Start command:** `npm start` (or uses Procfile: `node dist/server.js`)

## Deploy to Render (Free Tier)

1. Push to GitHub
2. New Web Service → connect repo
3. **Build Command:** `npm run install:all && npm run build`
4. **Start Command:** `node dist/server.js`
5. Add environment variables (same as Railway)
6. Deploy → free URL at `something.onrender.com`

> Note: Render free tier spins down after 15 min of inactivity (first request is slow).

## Admin Panel

- **URL:** `/admin`
- **Default password:** `admin123` ← Change this in production via the API!
- **JWT token:** stored in localStorage, expires in 8 hours

### Admin Sections

| Tab | Description |
|-----|-------------|
| Apariencia | Logo, background, colors, texts |
| Campos | Toggle form fields on/off |
| Leads | View, paginate, export CSV, delete registrations |
| Vista Previa | Live iframe preview of the portal |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/config` | No | Public portal config |
| POST | `/api/login` | No | Get JWT token |
| POST | `/api/portal/access` | No | Save lead data |
| GET | `/api/admin/config` | JWT | Full config |
| PUT | `/api/admin/config` | JWT | Update config |
| POST | `/api/admin/upload` | JWT | Upload image |
| GET | `/api/admin/leads` | JWT | Paginated leads |
| DELETE | `/api/admin/leads/:id` | JWT | Delete lead |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `JWT_SECRET` | dev-secret | Secret for JWT signing — **change in production!** |
| `NODE_ENV` | development | Set to `production` for deployment |
