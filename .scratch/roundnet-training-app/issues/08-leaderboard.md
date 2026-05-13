Status: ready-for-agent
Type: AFK

# 08 — Leaderboard

## Parent

`.scratch/roundnet-training-app/PRD.md`

## What to build

A read-only leaderboard ranking all Players by General Level and by individual Category Level. No new database tables; derives all data from `xp_ledger` via the Level Engine.

**API**
- `GET /leaderboard` — all Players ranked by General Level (descending); returns nickname, General Level, total XP per Player
- `GET /leaderboard/:category_id` — all Players ranked by their Category Level for that category; returns nickname, Category Level, category XP per Player

**Frontend**
- Leaderboard screen: overall tab ranked by General Level, plus one tab per Category
- Shows rank, nickname, and level for each Player
- Tapping a Player navigates to their profile

## Acceptance criteria

- [ ] `GET /leaderboard` returns all Players sorted by General Level descending
- [ ] `GET /leaderboard/:category_id` returns all Players sorted by that Category Level descending
- [ ] Players with 0 XP in a category still appear (at the bottom, level 1)
- [ ] Leaderboard screen shows overall and per-category tabs
- [ ] Each row shows rank, nickname, and level
- [ ] Tapping a Player navigates to their profile screen

## Blocked by

`06-session-logging-xp.md`
