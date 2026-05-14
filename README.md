# Roundnet Training App

A mobile-first PWA for tracking roundnet training sessions, XP, and levels.

## Stack

- **Backend**: Node.js + TypeScript + Express + Prisma + Vitest
- **Frontend**: React + TypeScript + Vite + vite-plugin-pwa + Vitest
- **Database**: PostgreSQL 16

## Running the full stack

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
docker-compose up
```

| Service  | URL                       |
|----------|---------------------------|
| Frontend | http://localhost:5173      |
| Backend  | http://localhost:3000      |
| Database | localhost:5432             |

Health check:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

## Running tests locally

Requires Node.js 20+.

```bash
# Backend
cd backend && npm install && npm test

# Frontend
cd frontend && npm install && npm test
```

## Database

The schema lives in `backend/prisma/schema.prisma`. No tables exist yet — migrations will be added in subsequent issues.

## PWA

The frontend is installable as a PWA on mobile via Chrome/Safari "Add to Home Screen". Replace `frontend/public/icon.svg` with proper PNG icons (192×192 and 512×512) before shipping to production.
