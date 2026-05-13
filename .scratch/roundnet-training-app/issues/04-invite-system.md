Status: ready-for-agent
Type: AFK

# 04 — Invite system

## Parent

`.scratch/roundnet-training-app/PRD.md`

## What to build

Gate registration behind invite codes. Adds the `invites` table, an Admin-only API endpoint to generate codes, and wires the invite code into the register screen and registration endpoint.

**Database migration** — creates the `invites` table:
- `id`, `code` (unique, randomly generated), `created_by` (player_id FK), `used_by` (player_id FK, nullable), `created_at`

**API**
- `POST /invites` — Admin only (check `is_admin` on JWT); generates and returns a new invite code
- `POST /auth/register` — update to require `invite_code` in the body; validate code exists and has not been used; mark code as used (`used_by`) on successful registration

**Frontend**
- Register screen — add invite code field (required)
- Admin home — show a "Generate invite" button visible only to Admins; display the generated code for copying

## Acceptance criteria

- [ ] `POST /invites` returns a new code for an Admin; returns 403 for non-Admin Players
- [ ] `POST /auth/register` succeeds with a valid unused invite code
- [ ] `POST /auth/register` fails with an already-used or non-existent invite code
- [ ] Used invite codes are marked with `used_by` after successful registration
- [ ] Register screen includes the invite code field and shows validation errors
- [ ] Admins see a "Generate invite" button and can copy the generated code

## Blocked by

`03-auth-register-login.md`
