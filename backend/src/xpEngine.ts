const QUALITY_MULTIPLIERS: Record<number, number> = {
  1: 0.5,
  2: 0.75,
  3: 1.0,
  4: 1.25,
  5: 1.5,
}

export function calculateXP(durationMinutes: number, qualityScore: 1 | 2 | 3 | 4 | 5): number {
  return durationMinutes * QUALITY_MULTIPLIERS[qualityScore]
}
