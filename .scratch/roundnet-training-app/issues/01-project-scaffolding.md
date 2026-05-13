Status: ready-for-agent
Type: HITL

# 01 — Project scaffolding & tooling

## Parent

`.scratch/roundnet-training-app/PRD.md`

## What to build

Set up the project structure and agree on the key library choices before any feature code is written. This is the only HITL slice — the decisions made here constrain every subsequent issue.

Decisions needed:
- **Frontend framework**: React, Vue, or Svelte (all viable for a mobile-first PWA)
- **ORM / query builder**: Prisma (type-safe, great DX), Drizzle (lightweight, SQL-close), or raw `pg` (no abstraction)
- **Test runner**: Vitest (recommended — fast, native TypeScript, works for both unit and integration) or Jest
- **Monorepo structure**: single repo with `backend/` and `frontend/` directories (recommended) or two separate repos

Once decided, scaffold:
- Backend: Node.js + TypeScript project with chosen ORM, a working `GET /health` endpoint, and test runner configured
- Frontend: TypeScript PWA project with chosen framework, mobile-first base styles, installable manifest
- Shared local dev setup: `docker-compose.yml` for PostgreSQL, a root-level `README.md` with setup instructions

## Acceptance criteria

- [ ] Backend runs locally and responds to `GET /health`
- [ ] Frontend renders a blank shell and is installable as a PWA on mobile
- [ ] PostgreSQL runs via `docker-compose up`
- [ ] Test runner executes with zero tests and exits cleanly
- [ ] README documents how to run the full stack locally

## Blocked by

None — can start immediately.
