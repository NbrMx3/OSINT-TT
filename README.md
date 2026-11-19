# OSINT-X

Phase 1 establishes the full-stack foundation for a professional open source intelligence platform.

## Stack

- `client/`: React, TypeScript, Vite, Tailwind CSS, shadcn-style UI primitives, Axios, React Router, TanStack Query, Lucide React, Recharts
- `server/`: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT, bcrypt, Zod, CORS, dotenv, Helmet, express-rate-limit

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

Phase 3 adds Prisma migrations and seeded roles, httpOnly-cookie authentication, tenant-scoped persistence, password reset flow, profile management, role authorization, and AES-256-GCM encryption for stored API configurations. Use `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed` from `server/` when provisioning a new environment.

Phase 4 adds tenant-scoped investigation CRUD, target and module selection, persisted lifecycle status, asynchronous job progress with retry/cancel handling, analyst notes, audit history, saved execution summaries, and explicit empty results until real intelligence modules write findings. Investigation endpoints are under `/api/investigations`.

Phase 5 adds the tenant-scoped Domain Intelligence Engine. `POST /api/domain/intelligence` validates a public domain and collects RDAP registration data, DNS records (A, AAAA, MX, TXT, NS, CNAME, and DNSSEC), certificate-transparency records from crt.sh, public website metadata, associated IP addresses, and reputation from configured VirusTotal credentials. Results and available-source evidence are persisted in PostgreSQL through Prisma. `GET /api/domain/history` lists saved collections and `GET /api/domain/results/:id` retrieves a result. Every collector has a timeout and source reference; unavailable records are returned as unavailable and are never fabricated.

Phase 6 adds tenant-scoped IPv4 and IPv6 intelligence. `POST /api/ip/intelligence`, `GET /api/ip/history`, and `GET /api/ip/results/:id` collect local address classification, public RDAP and geolocation, reverse DNS, associated domains, and configured AbuseIPDB, VirusTotal, and Shodan intelligence. Provider keys belong in `server/.env` as `ABUSEIPDB_API_KEY`, `VIRUSTOTAL_API_KEY`, and `SHODAN_API_KEY`; they are never sent to the browser or stored in results. Private and reserved targets are classified locally and are not sent to external providers. Shodan lookups use its passive host database and never request a scan. IP geolocation is an estimate about a network address and does not identify or locate a person.

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

The frontend dashboard calls `/api/health` through the Vite proxy and displays API readiness. Domain and IP Intelligence pages are available at `/domain` and `/ip` after authentication.
