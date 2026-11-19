# OSINT-X

Phase 1 establishes the full-stack foundation for a professional open source intelligence platform.

## Stack

- `client/`: React, TypeScript, Vite, Tailwind CSS, shadcn-style UI primitives, Axios, React Router, TanStack Query, Lucide React, Recharts
- `server/`: Node.js, Express, TypeScript, CORS, dotenv, Helmet, express-rate-limit

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Install

From the project root:

```powershell
cd client
npm install

cd ..\server
npm install
```

The server reads `PORT`, `CLIENT_ORIGIN`, and `DATABASE_URL` from `server/.env`. Copy `server/.env.example` to `server/.env`, then replace the placeholder `DATABASE_URL` with your Neon connection string. Never commit `server/.env`.

The API uses a pooled `pg` client with TLS and verifies the PostgreSQL connection during startup. `GET /api/health` also performs a live `SELECT 1` check and reports `database: "connected"` when Neon is available.

## Development

Run each service in its own terminal:

```powershell
cd client
npm run dev
```

The frontend is available at `http://localhost:5173` and proxies `/api` requests to the backend.

```powershell
cd server
npm run dev
```

The API is available at `http://localhost:5000`; the health check is `GET /api/health` and the typed dashboard contract is `GET /api/dashboard`.

## Verification

```powershell
cd client
npm run build

cd ..\server
npm run build
```

The frontend dashboard calls `/api/health` through the Vite proxy and displays API readiness. Investigation modules are intentionally out of scope for Phase 1.
