Status: ready-for-agent

# PRD: Roundnet Training Gamification App

## Problem Statement

Roundnet players who train regularly have no structured way to track their training sessions, measure progress across specific skill areas, or feel a sense of progression over time. Without visibility into improvement and no social accountability, motivation to train consistently is hard to sustain — especially for a small group of friends who train together.

## Solution

A mobile-first progressive web app (PWA) that lets a closed group of 10–15 Players log training Sessions, track XP and Levels both overall and per skill Category, and see each other's progress. The app turns structured training into a persistent progression system — the more you train with quality, the more you level up.

## User Stories

1. As a Player, I want to register with an invite code, email, password, and optional nickname, so that I can join the group without the app being open to strangers.
2. As an Admin, I want to generate an invite code or link, so that I can onboard a new Player to the group.
3. As a Player, I want to log in with my email and password, so that I can access my training data.
4. As a Player, I want to set or update my nickname, so that I appear with a recognisable name in the app.
5. As a Player, I want to create a Session for today's date, so that I can start logging what I trained.
6. As a Player, I want to set a Session's date to a past date, so that I can log training I forgot to record at the time.
7. As a Player, I want to add a Session Entry to a Session by selecting an Exercise, entering a duration in minutes, and giving a Quality Score of 1–5, so that I can record what I worked on and how well it went.
8. As a Player, I want to add multiple Session Entries to a single Session, so that I can capture an entire training block in one place.
9. As a Player, I want to see how much XP each Session Entry earned me, so that I understand the relationship between quality and reward.
10. As a Player, I want to see my current General Level and total XP, so that I know how my overall progression is going.
11. As a Player, I want to see my Category Level for each skill (Hitting, Serving, Reaction, Setting, Defence), so that I can identify where I'm strong and where I'm neglecting.
12. As a Player, I want to browse the shared Exercise Library, so that I can find the right exercise to log.
13. As a Player, I want to filter the Exercise Library by Category, so that I can quickly find relevant exercises.
14. As a Player, I want to add a new Exercise to the Exercise Library with a name and Category, so that I can log exercises that don't exist yet.
15. As a Player, I want to edit or delete an Exercise I created, so that I can fix mistakes or remove duplicates.
16. As a Player, I want to be prevented from editing Exercises created by other Players, so that the shared library stays reliable.
17. As a Player, I want to see any other Player's General Level, Category Levels, and recent Sessions, so that I can follow the group's progress.
18. As a Player, I want to see a leaderboard of all Players ranked by General Level, so that I can feel the friendly competition.
19. As a Player, I want to see a leaderboard per Category, so that I can see who the serving or hitting specialist is.
20. As a Player, I want the app to work well on my phone, so that I can log sessions right after training without switching to a desktop.

## Implementation Decisions

### Stack
- **Backend**: Node.js + TypeScript, REST API
- **Database**: PostgreSQL
- **Frontend**: Mobile-first PWA (TypeScript)
- **Auth**: Email/password with JWT tokens
- **Environment**: Run locally for now; hosting decisions deferred

### Modules

#### XP Engine
Pure function module. No database access.
- `calculateXP(durationMinutes: number, qualityScore: 1|2|3|4|5): number`
- Quality multipliers: 1→0.5, 2→0.75, 3→1.0, 4→1.25, 5→1.5
- Formula: `durationMinutes × multiplier`

#### Level Engine
Pure function module. No database access.
- `xpToLevel(totalXP: number): number` — returns level 1–100
- `levelToXpThreshold(level: number): number` — returns cumulative XP needed to reach that level
- Exponential curve anchored to: L10=180 XP, L20=540 XP, L50≈15,000 XP, L100≈200,000 XP

#### Auth
- Register with invite code, email, password, optional nickname
- Login returns a JWT
- Middleware to protect all other routes

#### Invite
- Admin generates invite codes (reusable or single-use, TBD)
- Codes are validated during registration
- Only Admins can create invites; first Player seeded as Admin

#### Player
- Read own profile and any Player's public profile
- Update own nickname
- Public profile exposes: nickname, General Level, Category Levels, recent Sessions

#### Category
- Seeded at startup with: Hitting, Serving, Reaction, Setting, Defence
- Stored as rows in the database, not hardcoded enum values
- Admin can add Categories in future without code changes

#### Exercise Library
- Create an Exercise (name + Category); creator stored on record
- Edit/delete restricted to the creator
- List all Exercises, filterable by Category
- Exercises are shared across all Players

#### Session
- Create a Session with a date (defaults to today, editable)
- List Sessions for any Player (visible to all)

#### Session Entry
- Add an Entry to a Session: Exercise reference + duration (minutes) + Quality Score
- On creation: calculate XP via XP Engine, write XP transaction, update Player's General Level and the relevant Category Level
- XP is applied to both General Level and Category Level simultaneously (not split)

#### Leaderboard
- Read-only. Queries all Players' General Level and Category Levels
- Sortable by General Level (overall) or by any Category Level

### Schema (high-level)

- `players` — id, email, password_hash, nickname, is_admin, created_at
- `invites` — id, code, created_by (player_id), used_by (player_id nullable), created_at
- `categories` — id, name
- `exercises` — id, name, category_id, created_by (player_id), created_at
- `sessions` — id, player_id, date, created_at
- `session_entries` — id, session_id, exercise_id, duration_minutes, quality_score, xp_earned, created_at
- `xp_ledger` — id, player_id, category_id (nullable for general XP), xp, source_entry_id, created_at

General Level and Category Levels are derived from `xp_ledger` at read time (or cached/materialised for performance later).

### API Shape (high-level)

- `POST /auth/register` — body: invite_code, email, password, nickname?
- `POST /auth/login` — body: email, password → JWT
- `POST /invites` — Admin only → invite code
- `GET /players` — list all Players (leaderboard data)
- `GET /players/:id` — Player public profile
- `PATCH /players/me` — update own nickname
- `GET /exercises` — list, filterable by `?category_id=`
- `POST /exercises` — create
- `PATCH /exercises/:id` — creator only
- `DELETE /exercises/:id` — creator only
- `GET /categories` — list all categories
- `GET /sessions?player_id=` — list Sessions for a Player
- `POST /sessions` — create a Session
- `POST /sessions/:id/entries` — add a Session Entry (triggers XP calculation)
- `GET /leaderboard` — all Players ranked by General Level
- `GET /leaderboard/:category_id` — Players ranked by Category Level

## Testing Decisions

**What makes a good test**: test external behavior through the module's public interface only. Do not assert on internal state, private functions, or implementation details. A test should break when the module's contract is violated, not when its internals are refactored.

### Modules with unit tests

**XP Engine**
- Test all 5 quality score multipliers produce correct XP
- Test edge cases: 0 minutes, max quality, min quality

**Level Engine**
- Test that the anchored XP thresholds produce the correct levels (180→L10, 540→L20, etc.)
- Test that `xpToLevel` and `levelToXpThreshold` are consistent inverses
- Test boundaries: 0 XP = L1, XP at cap = L100

**Session Entry** (integration test against a test database)
- Test that creating an entry writes the correct XP to `xp_ledger` for both General and Category
- Test that General Level and Category Level update correctly after entry creation
- Test that XP from different Categories accumulates independently in Category Levels

**Exercise Library** (integration test against a test database)
- Test that a Player can create an Exercise
- Test that a Player cannot edit or delete another Player's Exercise
- Test that filtering by Category returns only matching Exercises

## Out of Scope

- Streaks, badges, and achievements (planned for a future iteration)
- Match tracking (sets, rally scores, head-to-head records)
- Rep-based Session Entries (duration-only at launch)
- Push notifications or reminders
- Social features (comments, reactions, feed)
- Hosting and deployment configuration
- Admin UI for managing Players or Categories (seeding and admin flag set manually at launch)
- Privacy settings (all data is visible to all Players in the group)

## Further Notes

- The level curve constants (XP thresholds) should be centralised in the Level Engine module so they can be tuned without touching anything else.
- Categories are seeded as data rows, not code enums, specifically so new Categories can be added without a deployment.
- The `xp_ledger` table is append-only. Never update or delete XP rows — recalculate from the ledger if corrections are needed. This preserves a full audit trail and simplifies debugging.
- The first Player to be created should be automatically assigned Admin status.
