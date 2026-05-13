Status: ready-for-agent
Type: AFK

# 07 — Player profile & levels

## Parent

`.scratch/roundnet-training-app/PRD.md`

## What to build

Player profiles with General Level, Category Levels, and recent Sessions — visible to all Players. Also includes nickname update. No new database tables; all level data is derived from `xp_ledger` using the Level Engine.

**API**
- `GET /players` — list all Players with their General Level (for leaderboard use)
- `GET /players/:id` — public profile: nickname, `is_admin`, General Level, total XP, Category Levels (one per category), recent Sessions (last 10)
- `PATCH /players/me` — update own nickname

Level derivation: sum `xp_ledger` rows per player (and per category for Category Levels), then pass through `xpToLevel` from the Level Engine.

**Frontend**
- Profile screen: shows the Player's nickname, General Level + XP, a breakdown of all Category Levels, and a list of recent Sessions
- Own profile includes an edit button for nickname
- Accessible by tapping any Player's name anywhere in the app

## Acceptance criteria

- [ ] `GET /players/:id` returns correct General Level derived from total XP in `xp_ledger`
- [ ] `GET /players/:id` returns correct Category Level for each category
- [ ] `GET /players/:id` returns the Player's 10 most recent Sessions
- [ ] `PATCH /players/me` updates the nickname; returns 403 if targeting another Player
- [ ] Profile screen displays General Level, all Category Levels, and recent Sessions
- [ ] Nickname edit is visible and functional on own profile only
- [ ] Profile is accessible for any Player in the group

## Blocked by

`06-session-logging-xp.md`
