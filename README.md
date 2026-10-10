# Northstar Business Platform

A production-oriented starter for a cross-platform business operations platform. The first vertical slice includes account registration/login, a protected workspace dashboard, project/work-item creation, and persistent storage.

## Current scope
- Web client: React + TypeScript + Vite
- API: FastAPI + SQLAlchemy
- Local persistence: SQLite by default; PostgreSQL supported through `DATABASE_URL`
- Authentication: signed JWT access tokens and salted `scrypt` password hashes
- Tests: pytest API tests
- Containers: Dockerfiles and Compose configuration

**Important:** This is an initial engineering foundation, not a finished or audited production system. Before public launch, add email verification/password reset, rate limiting, stronger operational secret management, database migration management (Alembic), security review, observability, and platform-specific mobile/desktop release workflows.

## Prerequisites
- Python 3.11+
- Node.js 20+
- npm

## 1. Start the API
From the project root:

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\\Scripts\\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set a long random `JWT_SECRET`. For local development the API also has a non-production fallback, but do not use it for deployed environments.

```bash
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs
Health check: http://127.0.0.1:8000/health

## 2. Start the web client
In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). The client calls `http://127.0.0.1:8000` by default. To change it, set `VITE_API_URL` in `frontend/.env`.

## 3. Run tests

```bash
cd backend
pytest -q
```

## 4. Docker Compose
Set `JWT_SECRET` in your shell or `.env` before deploying. The Compose file starts PostgreSQL and the API; the frontend remains a separate dev server for now.

```bash
docker compose up --build
```

## Architecture

```text
React/TypeScript web client
          | HTTPS + JSON API
          v
FastAPI application -> SQLAlchemy -> SQLite (local) / PostgreSQL (deployed)
          |
          +-- JWT authentication
          +-- Users / Projects / Work items
```

The API is the source of truth. Never rely on UI-only checks for authorization. Every project query is scoped to the authenticated owner.

## Cross-platform strategy
The current deliverable is the shared API and web client. Recommended staged expansion:
1. Stabilize the API contract and responsive web experience.
2. Add mobile packaging using Capacitor or build a native client using React Native/Expo.
3. Add desktop packaging using Tauri or Electron.
4. Add offline-first local storage and a conflict-aware sync protocol before claiming robust offline support.

Hybrid/offline sync is **not yet implemented**; this first slice requires a network connection to the API.
