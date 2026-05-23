# ADR 0003 — Flat Attunement Model (Root-Anchored Links)

**Date:** 2026-05-23  
**Status:** Accepted

## Context

When a Player attunes their Domain to another Domain, that target Domain may itself already be attuned to a third Domain (a Root Domain). This creates a potential chain:

```
Alice (Root) ← Bob (attuned to Alice) ← Charlie (attuned to Bob)
```

The question is how to store and resolve Charlie's attunement link.

Two options were considered:

1. **Chain model** — Charlie's attunement link points to Bob. The system walks the chain at query time to find the root. Chains can be arbitrarily deep.
2. **Flat model** — when Charlie attunes to Bob, the system immediately resolves the chain and stores Charlie's link as pointing directly to Alice (the root). No chain is ever stored; every attuned Domain has exactly one direct reference to its Root Domain.

## Decision

**Use the flat model.** When a Player attunes to a Domain that is itself attuned, the system resolves the chain at attunement time and records the link directly to the Root Domain.

## Consequences

- Every attuned Domain has exactly one `root_domain_id` field — a direct foreign key to the Root Domain, never to an intermediary
- Leaderboard queries are trivial: `WHERE root_domain_id = X` with no recursive joins or graph traversal
- If an intermediary Domain (Bob's) is deleted or Ascends, no data migration is needed for downstream attuned Domains (Charlie's link already points to Alice)
- The "path of discovery" (the fact that Charlie found Alice through Bob) is not stored — this information is lost, but it has no functional use in the current model
- The system must resolve chains at write time (during the Attune action), not at read time — this is a small upfront cost paid once per attunement, not on every leaderboard query
