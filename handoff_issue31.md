# Handoff: Issue #31 — Join Request + Domain Invite (design grilling, incomplete)

## Status

Mid-grilling session. The discussion was clarifying gaps in issue #31 before handing it to an implementation agent. The user paused to rethink one open question (see below). Resume with `/grill-with-docs` and continue from the open questions section.

## Reference

- **Issue:** https://github.com/rkibistu/roundnet-training-app/issues/31
- **Blocking issues (closed):** #27 (Domain Accessibility States), #30 (Attune + Skill Pairs)
- **Domain glossary:** `CONTEXT.md` (repo root)
- **Frontend entry point:** `frontend/src/App.tsx`
- **Domain detail page:** `frontend/src/pages/DomainDetailPage.tsx`
- **API client:** `frontend/src/api/domains.ts`
- **Prisma schema:** `backend/prisma/schema.prisma` — note: `JoinRequest` and `DomainInvite` models **do not exist yet**

## Decisions made this session

### Join Request modes (two, not one)
A `POST /domains/:id/join-requests` supports two modes:
1. **Without `callerDomainId`** — on acceptance, auto-copy the root domain (same semantics as direct attune without domain selection on public domains)
2. **With `callerDomainId`** — validate at request time that the caller's domain is not already attuned; on acceptance, create the Attunement linking that domain to the root

Backend must reject mode 2 if `callerDomainId` is already attuned (400 at request time, not acceptance time).

### Domain lock ("pending attunement" state)
When a join request is submitted with a specific `callerDomainId`, that domain is locked — it cannot be used in another join request to a different root while the request is pending. Validation is enforced server-side at request submission time.

The lock releases when: owner accepts, owner rejects, or requester withdraws.

### Requester withdrawal
Add `DELETE /domains/:id/join-requests/:reqId` for the requester to withdraw their own pending request. This releases the domain lock.

(The issue currently only has `PATCH` for owner accept/reject — `DELETE` by the requester is missing and must be added.)

### `hasPendingJoinRequest` flag on Domain
`GET /domains` (and `GET /domains/:id`) must include a `hasPendingJoinRequest: boolean` field on the caller's own domains. The frontend uses this to filter the domain selection dropdown when submitting a join request — only non-attuned, non-locked domains are shown.

### Notification badge — fetch on navigation
The invite notification badge lives in `ShellLayout`. It fetches pending invite count on every route change (via `useLocation` listener). No polling, no websocket. Simple `GET` on nav.

### Pending requests panel — on DomainDetailPage, owner only
The owner sees pending join requests and sent invites directly on `DomainDetailPage`, not a separate settings route. Suggested as **two tabs**: "Join Requests" (inbound) and "Invites" (outbound).

Non-owners see **no** requests or invites section on the page.

### Missing endpoint: `GET /domains/:id/invites`
The issue has `POST /domains/:id/invites` and `DELETE /domains/:id/invites/:inviteId` but no GET. The owner's Invites tab needs it to list sent invites with their state. **Must be added to the issue.**

## Open question — user paused here

**Does `myJoinRequest` belong in `GET /domains/:id` response for non-owners?**

Context: non-owners visiting a protected domain's detail page need to know their own pending join request status to drive the action button:
- No pending request → show "Request to Attune"
- Pending request exists → show "Request pending" + "Withdraw" button

The proposed approach was to embed `myJoinRequest: { id: string, callerDomainId: string | null } | null` in the `GET /domains/:id` response for non-owners (null/absent for owners). The user said non-owners shouldn't see a requests *section* — but the button state still needs this data.

The user said they need to rethink this and will return.

**Related unresolved:** Should the owner's two tabs show only **pending** items, or full history (accepted/rejected/withdrawn/declined)?

## Remaining gaps not yet discussed

- Prisma schema fields for `JoinRequest` (status enum: pending/accepted/rejected/withdrawn?) and `DomainInvite` (status enum: pending/accepted/declined/cancelled?)
- Acceptance criteria missing: `POST /domains/:id/join-requests` with already-attuned `callerDomainId` returns 400
- Acceptance criteria missing: `POST /domains/:id/join-requests` with a `callerDomainId` that already has a pending join request returns 400
- Route for the Player's invite inbox page (e.g. `/invites`) — not yet in `App.tsx`
- What the "invite-only" state looks like for a non-owner visiting a private domain (shouldn't be reachable, but edge case if navigated to directly via URL)
- Frontend API client functions for all new endpoints (join requests CRUD, invites CRUD)

## Suggested skills

- `/grill-with-docs` — to continue the design session from the open question
- `/tdd` — once the design is finalised, to implement backend endpoints test-first
- `/to-issues` — if the session produces sub-tasks worth splitting off from issue #31
