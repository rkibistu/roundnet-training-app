Status: ready-for-agent
Type: AFK

# 02 — XP Engine & Level Engine

## Parent

`.scratch/roundnet-training-app/PRD.md`

## What to build

Two pure-function modules with no database access. These are the mathematical core of all gamification — every other module that touches XP or levels delegates to these.

**XP Engine**
- `calculateXP(durationMinutes: number, qualityScore: 1|2|3|4|5): number`
- Quality multipliers: 1→0.5, 2→0.75, 3→1.0, 4→1.25, 5→1.5
- Formula: `durationMinutes × multiplier`

**Level Engine**
- `xpToLevel(totalXP: number): number` — returns 1–100
- `levelToXpThreshold(level: number): number` — returns cumulative XP needed to reach that level
- Exponential curve anchored to: L1=0 XP, L10=180 XP, L20=540 XP, L50≈15,000 XP, L100≈200,000 XP
- All curve constants live in one place so they can be tuned without touching anything else
- Clamp output: below 0 XP → level 1; above L100 threshold → level 100

**Unit tests** (all of the following must pass):
- XP Engine: all 5 quality multipliers, 0-minute edge case
- Level Engine: anchored thresholds produce correct levels (180→10, 540→20), `xpToLevel` and `levelToXpThreshold` are consistent inverses, boundary cases (0 XP = L1, max XP = L100)

## Acceptance criteria

- [ ] `calculateXP` returns correct values for all 5 quality scores
- [ ] `calculateXP(0, anyScore)` returns 0
- [ ] `xpToLevel(180)` returns 10; `xpToLevel(540)` returns 20
- [ ] `levelToXpThreshold(xpToLevel(n)) <= n` for any valid XP value (consistent inverses)
- [ ] `xpToLevel(0)` returns 1; `xpToLevel(very large number)` returns 100
- [ ] All curve constants are in one file/object, not scattered across the module
- [ ] All tests pass

## Blocked by

`01-project-scaffolding.md`
