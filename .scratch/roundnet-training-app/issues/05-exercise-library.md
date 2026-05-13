Status: ready-for-agent
Type: AFK

# 05 — Exercise Library

## Parent

`.scratch/roundnet-training-app/PRD.md`

## What to build

The shared Exercise Library: database migrations, seeded Categories, full CRUD API with creator-only enforcement, browse/filter/add/edit UI, and integration tests.

**Database migrations**
- `categories` table: `id`, `name`. Seed with: Hitting, Serving, Reaction, Setting, Defence.
- `exercises` table: `id`, `name`, `category_id` (FK), `created_by` (player_id FK), `created_at`

**API**
- `GET /categories` — list all categories
- `GET /exercises` — list all exercises; supports `?category_id=` filter
- `POST /exercises` — create an exercise (authenticated); stores `created_by` from JWT
- `PATCH /exercises/:id` — update name or category; returns 403 if requester is not the creator
- `DELETE /exercises/:id` — returns 403 if requester is not the creator

**Frontend**
- Exercise Library screen: list all exercises, filter by category, search by name
- "Add exercise" form: name + category picker
- Edit/delete controls visible only on exercises the current Player created

**Integration tests** (against a test database):
- A Player can create an Exercise and it appears in the list
- A Player cannot edit or delete another Player's Exercise (403 returned)
- Filtering by category returns only matching exercises

## Acceptance criteria

- [ ] All 5 categories exist after first startup (seeded)
- [ ] `GET /exercises?category_id=X` returns only exercises in that category
- [ ] `POST /exercises` creates an exercise attributed to the authenticated Player
- [ ] `PATCH /exercises/:id` returns 403 when the requester is not the creator
- [ ] `DELETE /exercises/:id` returns 403 when the requester is not the creator
- [ ] Exercise Library UI lists all exercises and filters correctly by category
- [ ] Add form submits and the new exercise appears in the list immediately
- [ ] Edit/delete controls only appear on the current Player's exercises
- [ ] All integration tests pass

## Blocked by

`03-auth-register-login.md`
