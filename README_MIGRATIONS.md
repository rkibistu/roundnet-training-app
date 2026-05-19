# Database Migrations

This project uses **Prisma Migrate** to version-control the database schema.
Migration files live in `backend/prisma/migrations/` and are committed to git.

---

## Current migration history

| Migration | What it does |
|---|---|
| `20260514143751_add_players_table` | Creates the `Player` table |
| `20260519115530_init` | Creates the `Invite` table |

---

## Daily workflow

### Making a schema change

1. Edit `backend/prisma/schema.prisma`
2. Create and apply the migration:

```powershell
Set-Location backend
$env:DATABASE_URL="postgresql://roundnet:roundnet@localhost:5432/roundnet"
npx prisma migrate dev --name <describe-the-change>
```

Use a short, descriptive name — it becomes part of the folder name, e.g. `add-exercise-table`, `add-xp-column-to-player`.

Prisma will:
- Diff the schema against the DB
- Generate a `.sql` file under `backend/prisma/migrations/<timestamp>_<name>/`
- Apply it to your local DB immediately
- Regenerate the Prisma Client

3. Commit **both** the schema change and the new migration folder:

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "[MIGRATION] add exercise table"
```

---

### Applying migrations someone else wrote (after a `git pull`)

```powershell
Set-Location backend
$env:DATABASE_URL="postgresql://roundnet:roundnet@localhost:5432/roundnet"
npx prisma migrate dev
```

`migrate dev` applies any pending migrations and regenerates the client.

---

### Checking migration status

```powershell
Set-Location backend
$env:DATABASE_URL="postgresql://roundnet:roundnet@localhost:5432/roundnet"
npx prisma migrate status
```

Output tells you which migrations are applied and which are pending.

---

## Production / Docker

Use `migrate deploy` instead of `migrate dev` — it applies pending migrations without interactive prompts and never generates new files:

```bash
npx prisma migrate deploy
```

In Docker Compose, run this before the backend starts. The typical pattern is an entrypoint script or a one-off service in `docker-compose.yml`:

```yaml
backend:
  command: sh -c "npx prisma migrate deploy && node dist/index.js"
```

`migrate deploy` is safe to run on every startup — it is a no-op if there are no pending migrations.

---

## Common situations

### "My schema and DB are out of sync after a bad push"

Reset your local DB (destroys all data — local only):

```powershell
Set-Location backend
$env:DATABASE_URL="postgresql://roundnet:roundnet@localhost:5432/roundnet"
npx prisma migrate reset
```

This drops the DB, recreates it, and replays all migrations from scratch.

### "I want to preview the SQL before applying"

```powershell
npx prisma migrate dev --name <name> --create-only
```

This writes the migration file but does **not** apply it. Review the SQL in `backend/prisma/migrations/`, then run `npx prisma migrate dev` to apply.

### "I need to edit the generated SQL"

Open the `.sql` file before applying it. You can add index hints, custom constraints, or data backfills. After editing, run `npx prisma migrate dev` to apply.

---

## Rules

- **Never edit or delete a migration that has already been applied** in a shared environment (staging, production). Alter the schema forward with a new migration instead.
- **Always commit migration files together with the schema change** — they must stay in sync.
- **Never use `prisma db push` on a shared or production DB** — it bypasses the migration history and can cause drift.
