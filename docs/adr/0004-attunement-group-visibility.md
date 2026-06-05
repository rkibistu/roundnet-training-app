# ADR 0004 — Attunement-Group Read Visibility

**Date:** 2026-06-05  
**Status:** Accepted

## Context

Before this ADR, `canSee` was a sync, pure function that returned `false` for any non-owner of a `private` Domain. This made the leaderboard-sharing story impossible: a Player attuned to a private Root Domain still could not view it to manage Skill Pairs or read shared data, and group members could not see each other's Domain detail pages.

ADR 0003 established the flat attunement model — every attuned Domain holds a direct `rootDomainId` reference to its Root Domain. This gives us a natural, cheap group-membership check without recursive queries.

Two approaches were considered:

1. **Keep visibility per-owner** — private means only the owner can see it. Group members get read access via a dedicated API endpoint rather than through normal Domain reads.
2. **Attunement-group visibility** — every member of an Attunement Group may read all Domains in the group, reversing the "private = invisible to non-owners" default for group members.

## Decision

**Adopt Attunement-group visibility for reads.**

Every member of a Root Domain's Attunement Group may *read* that Root Domain and every Domain attuned to it — names, Skills, levels, XP — even when those Domains are `private`. Group membership is defined as:

- owns the Root Domain, **or**
- owns a Domain whose `rootDomainId` equals the group root *(attuned member)*, **or**
- (Part 2, not yet implemented) holds a pending Domain Invite into the group.

This extends the existing leaderboard-sharing contract (ADR 0003) to detail pages and Skills.

The `canSee` function is replaced by an **async** `canSeeDomain(requesterId, domain)` that performs a single batched membership lookup for the `private` branch. The helper `groupRoot(domain)` returns `domain.id` for a Root Domain and `domain.rootDomainId` for an attuned Domain.

## Consequences

**The visibility relaxation is strictly READ-ONLY:**

- `POST /domains/:id/fracture` — private Domains cannot be fractured regardless of group membership. An explicit `accessibilityState === 'private' → 403` guard replaces the old `canSee` guard.
- `POST /domains/:id/attune` — private Domains cannot be directly attuned (invite-only). An explicit `accessibilityState === 'private' → 403 ("use an invite")` guard replaces the old `canSee` guard.
- Management data (Join Requests, sent Domain Invites) is never exposed through read paths.
- Only Domains in the same Attunement Group become visible; unrelated private Domains remain invisible.

**`GET /domains` list** includes group-visible private Domains for members, computed with a batched two-query approach (requester's own Domains → derive group roots → single filtered query) to avoid N+1.

**Sets up the invite/request flows** (Parts 2 and 3): the seam for pending-invite group membership is left as a comment in `canSeeDomain`.
