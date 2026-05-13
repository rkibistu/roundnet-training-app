Status: ready-for-agent
Type: AFK

# 03 — Auth: register + login

## Parent

`.scratch/roundnet-training-app/PRD.md`

## What to build

End-to-end auth slice: database migration, API endpoints, JWT middleware, and the login/register UI screens.

**Database migration** — creates the `players` table:
- `id`, `email` (unique), `password_hash`, `nickname` (nullable), `is_admin` (boolean, default false), `created_at`
- The very first Player inserted is automatically set as Admin (handle in registration logic, not a DB constraint)

**API**
- `POST /auth/register` — body: `{ email, password, nickname? }`. Note: invite code validation is added in issue 05; for now, registration is open so the first Admin can be created.
- `POST /auth/login` — body: `{ email, password }` → returns JWT
- JWT middleware — protects all non-auth routes; attaches player id and is_admin to request context

**Frontend screens**
- Login screen: email + password fields, submit, error display
- Register screen: email + password + optional nickname fields, submit, error display
- On successful login/register, redirect to a placeholder home screen
- Persist JWT in localStorage; attach to all subsequent API requests

## Acceptance criteria

- [ ] `POST /auth/register` creates a Player; first Player has `is_admin = true`
- [ ] `POST /auth/login` returns a JWT for valid credentials; returns 401 for invalid
- [ ] JWT middleware rejects requests to protected routes without a valid token
- [ ] Passwords are hashed (never stored in plaintext)
- [ ] Login and register screens render on mobile, submit correctly, and display API errors
- [ ] Successful auth redirects to a placeholder home screen
- [ ] JWT persists across page refreshes

## Blocked by

`01-project-scaffolding.md`
