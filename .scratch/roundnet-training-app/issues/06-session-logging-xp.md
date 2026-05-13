Status: ready-for-agent
Type: AFK

# 06 — Session logging with XP

## Parent

`.scratch/roundnet-training-app/PRD.md`

## What to build

The core write path: Players log Sessions and Session Entries, XP is calculated and written to the ledger, and levels update. Includes database migrations, API, UI, and integration tests.

**Database migrations**
- `sessions` table: `id`, `player_id` (FK), `date` (date, not timestamp), `created_at`
- `session_entries` table: `id`, `session_id` (FK), `exercise_id` (FK), `duration_minutes`, `quality_score` (1–5), `xp_earned`, `created_at`
- `xp_ledger` table: `id`, `player_id` (FK), `category_id` (FK, nullable — null means general XP), `xp`, `source_entry_id` (FK to session_entries), `created_at`. Append-only: never update or delete rows.

**API**
- `POST /sessions` — body: `{ date? }` (defaults to today); returns the created session
- `GET /sessions?player_id=` — list sessions for a Player, visible to all authenticated Players
- `POST /sessions/:id/entries` — body: `{ exercise_id, duration_minutes, quality_score }`:
  1. Calculate XP via XP Engine
  2. Write two rows to `xp_ledger`: one with `category_id = null` (general), one with the exercise's category id
  3. Persist `xp_earned` on the entry row
  4. Return the entry with `xp_earned` included

**Frontend**
- Session log screen: create a new Session (date picker defaults to today), add Session Entries by picking an exercise, entering duration, and selecting a Quality Score 1–5
- Show `xp_earned` on each entry after it is saved
- List past Sessions for the current Player

**Integration tests** (against a test database):
- Creating a Session Entry writes two `xp_ledger` rows: one general, one for the correct category
- `xp_earned` on the entry matches `calculateXP(duration, qualityScore)`
- XP from two different categories accumulates independently (category A ledger unaffected by category B entries)
- General XP ledger accumulates across all categories

## Acceptance criteria

- [ ] `POST /sessions` creates a session; date defaults to today when omitted
- [ ] `POST /sessions/:id/entries` returns the entry with correct `xp_earned`
- [ ] Two `xp_ledger` rows are written per entry: one general, one category-specific
- [ ] `xp_ledger` rows are never updated or deleted
- [ ] Session log UI lets a Player create a session, add entries, and see XP earned per entry
- [ ] Date picker on session creation defaults to today and is editable
- [ ] Past sessions are listed for the current Player
- [ ] All integration tests pass

## Blocked by

`02-xp-level-engine.md`, `05-exercise-library.md`
