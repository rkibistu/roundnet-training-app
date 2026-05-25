# Habit Tracker Gamification

A mobile-first PWA where Players create and track personal Habit Domains, earn XP and levels per Skill and Domain, and optionally share leaderboards with others by attuning their domains together.

## Language

**Player**:
A registered user of the app, identified by email/password and an optional nickname. Registration is open — no invite code required.
_Avoid_: user, athlete, member

**Habit Domain** (or just **Domain**):
A named collection of Skills representing a pursuit or interest area created by a Player (e.g. "Roundnet", "Gym", "Better Life"). A Player can own multiple Domains. Each Domain has a Domain Accessibility State and an owner.
_Avoid_: category group, skill set, topic

**Skill**:
A named, trackable unit within a Habit Domain defined by the Domain's owner (e.g. "Serving", "Push-ups", "Read"). The leaf level at which Session Entries are logged and XP is earned. Each Skill belongs to exactly one Domain. Only the Domain's owner can create, rename, archive, or restore Skills in that Domain. Attuned Players can only edit Skills in their own copy. A Skill is either **active** or **archived** (see Archived Skill).
_Avoid_: exercise, drill, category, activity

**Archived Skill**:
A Skill the owner has retired without losing its history. Archiving (the "delete" action) sets an `archivedAt` timestamp instead of removing the row. An archived Skill: is hidden from the default Skill list (opt-in to view), cannot be the target of new Session Entries, has any existing Skill Pair broken on archive, and keeps all its existing Session Entries and XpLedger rows intact — so the XP it earned still feeds Domain Level and General Level. Archive is reversible: restoring clears `archivedAt` and the Skill becomes active again. Re-pairing after restore is manual.
_Avoid_: deleted skill, removed skill, inactive skill

**Domain Accessibility State**:
Controls who can see and interact with a Domain. Three states: **public** (visible to all; anyone can Attune or Fracture directly; owner cannot remove attuned Players), **protected** (visible to all; Fracture is open, Attune requires a Join Request the owner must accept; owner can remove attuned Players), **private** (invisible to all except the owner and Players with a Domain Invite; neither Attune nor Fracture is possible without an invite; owner can remove attuned Players). Defaults to public. Protected and private are freely interchangeable. Public is permanent — a public Domain cannot be switched to protected or private; instead the owner must trigger Ascension (see Ascended Domain). An Ascended Domain is always treated as public.
_Avoid_: visibility, permission level

**Root Domain**:
The Domain that anchors an attunement group — the one all attuned Players ultimately link to. When a Player attunes to a Domain that is itself attuned to another, the system resolves the chain immediately and records the link to the root. There is exactly one Root Domain per attunement group.
_Avoid_: parent domain, original domain, base domain

**Attune** (action):
The act of linking your Domain to a Root Domain, joining its leaderboard group. An attuned Player gets their own Domain (editable) whose Skills may be paired with the Root's Skills for comparison. The attunement link is stored as a direct reference to the Root Domain, never to an intermediary. A Domain can be attuned to at most one Root Domain at a time. Re-attuning to a different Root Domain is allowed; all existing Skill Pairs are cleared when switching. The Root Domain owner may remove an attuned Player from a protected or private Domain at any time; the removed Player's Domain becomes standalone (Session history and Skills preserved, attunement link dropped). Removal is not possible on public Domains.
_Avoid_: join, subscribe, follow, sync

**Fracture** (action):
Creating an independent copy of another Domain (its name and Skills) with no ongoing link to the original. The resulting Domain is fully owned by the Player who fractured, as if they had created it from scratch. Requires the source Domain to be visible (public or protected). Private Domains cannot be fractured.
_Avoid_: fork, clone, copy, detach

**Skill Pair**:
A declared equivalence between one Skill in a Player's Domain and one Skill in the Root Domain they are attuned to. Used for leaderboard comparisons and statistics. A Skill without a pair still contributes to Domain Level but is excluded from paired comparisons. Pairs can be created or destroyed at any time, subject to the Root Domain's Accessibility State. All Skill Pairs are cleared when a Domain re-attunes to a different Root Domain. Editing a paired Skill prompts the Player to either keep the pair or break it.
_Avoid_: skill mapping, skill link, skill match

**Domain Invite**:
A direct invitation sent by a Domain owner to a specific Player (by username or email) to Attune to their Domain. Bypasses the Domain Accessibility State — a private Domain owner can still invite specific Players. Also usable on public Domains as a discovery shortcut.
_Avoid_: invite code, invite link, invite token

**Join Request**:
A Player's request to Attune to a protected Domain. Sent by the Player when they discover the Domain. The owner must accept before the Attunement is established. Not applicable to public Domains (direct access) or private Domains (no requests allowed — only Domain Invites work).
_Avoid_: access request, membership request

**Ascended Domain**:
A Root Domain that has entered a permanent community-preservation state, triggered in two ways: (1) the owner deletes it, or (2) the owner of a public Domain wants to change its Accessibility State. In both cases the Domain persists as a structural anchor for all attuned Players, is treated as public, and no longer accumulates XP or appears as an active Domain for its original owner. When triggered, the owner receives a new Domain pre-populated with their own Skills and Session history (their personal data is preserved; only the community anchor stays behind). The new Domain's Accessibility State is the owner's free choice. An Ascended Domain is garbage-collected once no attuned Domains remain.
_Avoid_: archived domain, deleted domain, inactive domain

**Session**:
A single block of activity logged by a Player on a specific date (defaults to today, editable), containing one or more Session Entries. Belongs to one Habit Domain.
_Avoid_: workout, training, practice

**Session Entry**:
A record of one Skill performed within a Session, capturing duration and a Quality Score.
_Avoid_: log entry, drill log, activity

**XP (Experience Points)**:
Points earned from Session Entries, calculated as `duration_minutes × quality_multiplier`. Feeds into the Skill Level for that entry's Skill, the Domain Level for that Skill's Domain, and the Player's General Level simultaneously.
_Avoid_: points, score

**Quality Score**:
A 1–5 self-assessment of how well a Session Entry went. Maps to XP multipliers: 1→0.5, 2→0.75, 3→1.0, 4→1.25, 5→1.5.
_Avoid_: rating, performance score

**Skill Level**:
A Player's progression level within a specific Skill, derived from XP earned from Session Entries logged against that Skill.
_Avoid_: category level, exercise level

**Domain Level**:
A Player's progression level within a specific Habit Domain, derived from XP earned across all Skills in that Domain.
_Avoid_: habit level, area level

**General Level**:
A Player's overall progression level, derived from cumulative XP across all their Domains.
_Avoid_: total level, main level, rank

## Relationships

- A **Player** owns one or more **Habit Domains**
- A **Habit Domain** contains one or more **Skills**
- A **Player** logs **Sessions** against a specific **Habit Domain**
- A **Session** contains one or more **Session Entries**
- Each **Session Entry** references one **Skill** from the Session's Domain
- Each **Session Entry** earns **XP** that feeds simultaneously into the **Skill Level**, **Domain Level**, and **General Level**
- A **Player** may Attune their Domain to a **Root Domain**, joining its leaderboard group
- A **Skill Pair** links one Skill from an attuned Player's Domain to one Skill in the Root Domain

## XP & Level Curve

- XP per entry: `duration_minutes × quality_multiplier`
- Level curve: exponential, tuned so that level 10 ≈ 1 week of regular training (3–4 sessions, ~45 min, medium quality), level 20 ≈ 3 weeks, level 100 ≈ 2 years
- Approximate cumulative XP thresholds: L10=180, L20=540, L50=15,000, L100=200,000

## Deployment

- **Frontend**: Vercel — auto-deploys on push to `main`. Vite preset, root directory set to `frontend/`. All routes rewrite to `index.html` (see `frontend/vercel.json`) for SPA client-side routing.
- **Backend**: Render free tier — runs `prisma migrate deploy && node dist/index.js`. Binds to `0.0.0.0:$Port`.
- **Database**: Supabase free tier — PostgreSQL, accessed via `DATABASE_URL`. Migrations managed by Prisma.
- **Keep-alive**: UptimeRobot pings `/health` every 5 minutes to prevent Render cold starts.

## Example dialogue

> **Dev:** "When a Player logs a Session Entry for their 'Serving' Skill in their Roundnet Domain, where does the XP go?"
> **Domain expert:** "It goes to three places simultaneously: the Serving Skill Level, the Roundnet Domain Level, and the Player's General Level — the same XP, applied to all three."

> **Dev:** "Alice's 'Serving' Skill and Bob's 'Serve' Skill — are those the same for leaderboard purposes?"
> **Domain expert:** "Only if they've declared a Skill Pair between them. Without a declared pair, they're treated as unrelated Skills."

> **Dev:** "Alice deleted her Domain but Bob is attuned to it. What happens?"
> **Domain expert:** "Alice's Domain Ascends. Bob stays attuned to it. The Domain becomes public so Bob can manage his Skill Pairs without needing Alice's approval."
