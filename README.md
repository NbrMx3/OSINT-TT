# Kipkemoi OSINT Intelligence Platform

Phase 1 foundation for an authorised OSINT investigation platform.

## Current scope

- React + TypeScript + Vite client shell
- FastAPI backend with PostgreSQL-ready SQLAlchemy models
- JWT registration/login and role-aware user model
- Alembic migration setup
- Docker Compose for PostgreSQL and API development
- Health and authentication API tests

## Quick start

1. Copy `server/.env.example` to `server/.env`.
2. Start PostgreSQL with `docker compose up -d db`.
3. Create a Python environment and install `server/requirements.txt`.
4. Run `alembic upgrade head` from `server`.
5. Start the API with `uvicorn app.main:app --reload` from `server`.
6. Install client dependencies with `npm install` from `client`, then run `npm run dev`.

The client expects the API at `http://localhost:8000/api/v1`. Set `VITE_API_BASE_URL` to override it.

## Security boundary

This foundation only supports authenticated account creation and session management. OSINT collection engines will be added in later phases with strict validation, passive-by-default collection, SSRF protections, rate limits, and explicit authorization controls.
