# ADR 0001 — Tailwind CSS and Design System

**Date:** 2026-05-20  
**Status:** Accepted

## Context

The frontend has zero CSS — raw semantic HTML with no visual polish. The app is a mobile-first PWA used by a small, closed group of 10–15 Players. A redesign is anticipated later, so the styling layer must be easy to rethink without touching component logic.

Three realistic options were considered:

1. **Tailwind CSS** — utility-first, design tokens enforced via config, no runtime cost
2. **Plain CSS with custom properties** — full control, zero dependency, but requires writing the design system from scratch
3. **Component library (MUI, Chakra, Mantine)** — ready-made components, but imposes layout and API opinions that conflict with future redesigns and adds significant bundle weight for a PWA

## Decision

Use **Tailwind CSS v4** with a custom design token config. No component library on top.

v4 was installed (npm resolved to latest). Unlike v3, v4 uses a CSS-first config: tokens are defined in `src/index.css` via `@theme {}` directives rather than a `tailwind.config.js` file. Dark mode class strategy is declared with `@custom-variant dark`. No `postcss.config.js` needed — the `@tailwindcss/vite` plugin handles everything.

### Color palette

| Token | Hex | Role |
|---|---|---|
| `brand-darkest` | `#1F2421` | Dark mode background; light mode primary text |
| `brand-dark` | `#216869` | Dark mode card/surface background |
| `brand-mid` | `#49A078` | Primary accent — buttons, active states, XP bars |
| `brand-light` | `#9CC5A1` | Secondary text on dark; hover states |
| `brand-lightest` | `#DCE1DE` | Light mode background; dark mode muted text |
| `xp-gold` | `#E8B84B` | XP counts, level badges, Quality Score highlights only |

Gold (`#E8B84B`) is reserved strictly for gamification feedback (XP earned, level badges). It must not be used for general UI actions to preserve its reward-signal meaning.

### Theme

Dark and light mode both supported, toggled manually by the Player via a button in the shell header. Preference persisted to `localStorage`. Implemented via Tailwind's `darkMode: 'class'` strategy — a `dark` class on `<html>`.

System-aware (`prefers-color-scheme`) was considered but rejected: it doubles design surface for an app explicitly planned for redesign.

### Typography

**Inter** (Google Fonts), weights 400 and 600 only. Loaded via a single `<link>` in `index.html`. System font stack was considered; Inter was chosen for consistent rendering across Android devices in the group.

Typography is expected to evolve — the font choice is not load-bearing for any other decision.

### Navigation

Bottom tab bar with four regular tabs (Home, Library, Leaderboard, Profile) and a center floating action button for Sessions. Sessions is the primary player action; the FAB makes it unreachable impossible to miss and follows established mobile fitness app conventions.

### List items

Cards — rounded surfaces with a background contrast against the page (not flat rows with dividers). Sessions and Exercises each carry 3–4 data points; cards give each item breathing room and avoid visual noise at the list level.

## Consequences

- All component styling uses Tailwind utility classes; no separate `.css` files except `src/index.css` which owns the Tailwind import and `@theme` tokens
- Custom tokens (`brand-*`, `xp-gold`) are defined in `src/index.css` under `@theme` and must be used consistently — raw hex values in className strings are not allowed
- Future redesign means updating the `@theme` block in `src/index.css` and sweeping className strings — no logic changes required
- Bundle size impact is minimal: Tailwind's JIT compiler purges unused classes at build time
