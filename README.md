# OSINT-X

Phase 1 establishes the full-stack foundation for a professional open source intelligence platform.

## Stack

- `client/`: React, TypeScript, Vite, Tailwind CSS, Axios, React Router, TanStack Query, Lucide React
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

The server reads `PORT` and `CLIENT_ORIGIN` from `server/.env`. Copy `server/.env.example` to `server/.env` when starting from a clean checkout.

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

The API is available at `http://localhost:5000`; the health check is `GET /api/health`.

## Verification

```powershell
cd client
npm run build

cd ..\server
npm run build
```

The frontend dashboard calls `/api/health` through the Vite proxy and displays API readiness. Investigation modules are intentionally out of scope for Phase 1.
