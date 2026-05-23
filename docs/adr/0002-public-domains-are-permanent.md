# ADR 0002 — Public Domains Are Permanent

**Date:** 2026-05-23  
**Status:** Accepted

## Context

A Habit Domain has a Domain Accessibility State (public, protected, private). The question arose: should a Domain owner be able to change their Domain's state after creation — specifically, can a public Domain be locked down to protected or private?

The tension is between two competing interests:

- **Owner control**: the owner created the Domain and should be able to manage it however they want
- **Community trust**: Players who attuned to a public Domain did so under the expectation of open access; a sudden lock-out would be disruptive and unfair

Two options were considered:

1. **All states freely switchable** — the owner can change state at any time, including public → private. Attuned Players on a now-private Domain would retain their attunement but the Domain would be closed to new joiners.
2. **Public is a permanent social contract** — once a Domain is set to public, it cannot become protected or private. If the owner wants to "close" the Domain, they trigger Ascension: the Domain enters a community-preservation state, the community stays attuned to it, and the owner receives a new Domain pre-populated with their own history.

## Decision

**Public Domains are permanent.** A public Domain cannot be switched to protected or private. The owner's only exit is Ascension.

Protected and private remain freely interchangeable with each other, since both involve explicit owner control from the start and no community expectation of open access.

## Consequences

- Players attuning to a public Domain can rely on it remaining open — the accessibility promise is irrevocable
- A public Domain owner who wants to "close" triggers Ascension: their personal Skills and Session history are copied into a new Domain (their choice of state), and the original Domain persists as a public community anchor
- The backend must enforce the public → protected/private transition as an illegal operation, not just a UI guard
- Owners of public Domains also cannot remove attuned Players — the open commitment is total
- The Ascension path must be surfaced clearly in the UI so owners understand it is the intended mechanism, not a workaround
