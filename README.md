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

`CLIENT_ORIGIN` accepts a comma-separated allowlist of exact browser origins. `REQUEST_TIMEOUT_MS` bounds incoming requests (1-120 seconds), and `DATA_RETENTION_DAYS` controls automatic deletion of expired social intelligence records. In production, use HTTPS origins, a high-entropy `JWT_SECRET`, a random 64-character hexadecimal `ENCRYPTION_KEY`, and `NODE_ENV=production`.

The API uses a pooled `pg` client with TLS and verifies the PostgreSQL connection during startup. `GET /api/health` also performs a live `SELECT 1` check and reports `database: "connected"` when Neon is available.

Phase 3 adds Prisma migrations and seeded roles, httpOnly-cookie authentication, tenant-scoped persistence, password reset flow, profile management, role authorization, and AES-256-GCM encryption for stored API configurations. Use `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed` from `server/` when provisioning a new environment.

The system administrator console is independent from analyst accounts. Apply migrations, set `ADMIN_EMAIL`, `ADMIN_NAME`, and a strong `ADMIN_PASSWORD` in `server/.env`, then run `npm run db:seed` to create or update the separate administrator account. Administrators sign in at `/admin/login`; the console at `/admin/dashboard` can review users, tenants, investigations, and paginated cross-tenant activity logs. Admin sessions use a separate httpOnly cookie and authentication path from user sessions.

Security settings now support TOTP authenticator MFA and one-time recovery codes for both users and administrators. Users manage MFA and active sessions from `/profile`; administrators use `/admin/security`. Passwords require at least 12 characters with uppercase, lowercase, numeric, and special characters. MFA secrets are encrypted with `ENCRYPTION_KEY`, recovery codes are stored as hashes, and sessions can be individually revoked or force-logged-out.

Phase 4 adds tenant-scoped investigation CRUD, target and module selection, persisted lifecycle status, asynchronous job progress with retry/cancel handling, analyst notes, audit history, saved execution summaries, and explicit empty results until real intelligence modules write findings. Investigation endpoints are under `/api/investigations`.

Phase 5 adds the tenant-scoped Domain Intelligence Engine. `POST /api/domain/intelligence` validates a public domain and collects RDAP registration data, DNS records (A, AAAA, MX, TXT, NS, CNAME, and DNSSEC), certificate-transparency records from crt.sh, public website metadata, associated IP addresses, and reputation from configured VirusTotal credentials. Results and available-source evidence are persisted in PostgreSQL through Prisma. `GET /api/domain/history` lists saved collections and `GET /api/domain/results/:id` retrieves a result. Every collector has a timeout and source reference; unavailable records are returned as unavailable and are never fabricated.

Phase 6 adds tenant-scoped IPv4 and IPv6 intelligence. `POST /api/ip/intelligence`, `GET /api/ip/history`, and `GET /api/ip/results/:id` collect local address classification, public RDAP and geolocation, reverse DNS, associated domains, and configured AbuseIPDB, VirusTotal, and Shodan intelligence. Provider keys belong in `server/.env` as `ABUSEIPDB_API_KEY`, `VIRUSTOTAL_API_KEY`, and `SHODAN_API_KEY`; they are never sent to the browser or stored in results. Private and reserved targets are classified locally and are not sent to external providers. Shodan lookups use its passive host database and never request a scan. IP geolocation is an estimate about a network address and does not identify or locate a person.

Phase 7 adds separate tenant-scoped Email and Username Intelligence modules at `/email` and `/username`. Their API endpoints are `POST /api/email/intelligence`, `GET /api/email/history`, `GET /api/email/results/:id`, `POST /api/username/intelligence`, `GET /api/username/history`, and `GET /api/username/results/:id`. Email collection checks MX, SPF, DMARC and common DKIM selectors through the configured system DNS resolver, and reads registration details via RDAP. SPF is inspected but not recursively evaluated. Authorized breach checks are opt-in per request and require `HIBP_API_KEY`; the email page discloses when the address is sent to HIBP. Public code references use a user-initiated Grep.app link. OSINT-X does not automate or scrape Grep.app, consistent with its [Terms of Service](https://grep.app/terms). Results contain source status, collection timestamps and saved evidence; no breach or profile results are fabricated.

Username collection uses GitHub's public users API and may show similar GitHub search candidates when no exact profile exists. Reddit lookup is disabled until an authorized Reddit application is configured with `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, and a registered `REDDIT_USER_AGENT`. Use Reddit only in accordance with its current [Developer Terms](https://redditinc.com/policies/developer-terms) and [Data API Terms](https://redditinc.com/policies/data-api-terms). Confidence is a handle-match assessment, not proof that profiles across platforms belong to the same person. No password discovery, account access, or private scraping is performed.

Phase 9 adds the tenant-scoped Threat Intelligence Engine at `/threat`. `POST /api/threat/intelligence`, `GET /api/threat/history`, and `GET /api/threat/results/:id` accept IP addresses, domains, HTTP(S) URLs, and MD5/SHA-1/SHA-256 file hashes. The engine normalizes provider responses from VirusTotal, AbuseIPDB, AlienVault OTX, Shodan, and URLhaus, persists historical results and source evidence, and reports provider verdicts separately from the OSINT-X aggregate classification. Provider keys are read from `VIRUSTOTAL_API_KEY`, `ABUSEIPDB_API_KEY`, `OTX_API_KEY`, and `SHODAN_API_KEY`, or from encrypted tenant API configurations using the matching provider name and an `apiKey` property. URLhaus is queried without credentials for supported URLs and hashes. Unsupported indicator/provider combinations and unavailable providers are explicitly marked; no threat result is fabricated. Requests have bounded timeouts, retries for transient failures, response-size limits, and route rate limits.

Phase 10 adds the tenant-scoped Intelligence Correlation and Graph Engine at `/graph`. `POST /api/graph/correlate` normalizes stored domain, IP, email, username, website, social, and threat results into deduplicated entities and confidence-scored relationships. `GET /api/graph` returns graph entities, relationship attribution, confidence factors, and supporting evidence; entities and relationships can also be added directly. Graph layouts can be saved through `/api/graph/layouts`. The React Flow workspace supports zoom, pan, drag layout, minimap, search, entity-type filtering, node selection, relationship detail, correlation execution, layout saving, and JSON export. Relationship confidence combines source reliability, evidence quality, corroboration, and freshness. Shared IPs, names, handles, or other identifiers remain investigative leads and never automatically establish common ownership or identity.

Phase 11 adds reporting and analytics. `POST /api/reports` generates a branded PDF from real tenant-scoped investigation records, findings, collection results, graph relationships, evidence, and analyst notes. Reports can be listed and filtered through `GET /api/reports`, downloaded as PDF through `/api/reports/:id/pdf`, exported as JSON or CSV through `/api/reports/:id/export?format=json|csv`, viewed through `/api/reports/:id`, and deleted through `DELETE /api/reports/:id`. The Reports workspace supports generation, search, status filtering, downloads, structured exports, and confirmation-gated deletion. `GET /api/dashboard` now returns database-backed investigation statistics, trends, findings by category, source status, threat distribution, analyst activity, and completion rates. Reports distinguish recorded observations, source attribution, confidence, limitations, and conclusions; unsupported conclusions are not presented as facts.

The optional provider variables are listed in `server/.env.example`. Configure them only in `server/.env`; do not expose or commit provider secrets. `GITHUB_API_TOKEN` is optional for GitHub public profile lookup and search rate limits; Email Intelligence does not use it to search code. Public API availability and permitted use can change, so use current provider documentation for [Have I Been Pwned](https://haveibeenpwned.com/API/v3), [GitHub REST](https://docs.github.com/en/rest/users/users), and [Reddit's API](https://www.reddit.com/dev/api/).

## Production deployment

Build the API with `npm run build` in `server/`, apply migrations with `npm run db:migrate:deploy`, and start it with `npm start`. Render should run the migration command during deploy and expose `GET /api/health` as its health check. Set `DATABASE_URL` to the Neon pooled connection string and configure the production `CLIENT_ORIGIN` to the Vercel deployment origin. Build the client with `npm run build` in `client/` and set `VITE_API_URL` only when the API is hosted on a different origin; same-origin deployments use the Vite `/api` proxy during development.

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
