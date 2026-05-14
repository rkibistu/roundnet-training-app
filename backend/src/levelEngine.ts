export const LEVEL_CURVE = {
  A: 7.12,
  B: 1.470,
  MAX_LEVEL: 100,
}

export function levelToXpThreshold(level: number): number {
  if (level <= 1) return 0
  const n = Math.min(level, LEVEL_CURVE.MAX_LEVEL) - 1
  return Math.round(LEVEL_CURVE.A * Math.pow(n, LEVEL_CURVE.B))
}

export function xpToLevel(totalXP: number): number {
  if (totalXP <= 0) return 1
  for (let level = LEVEL_CURVE.MAX_LEVEL; level >= 2; level--) {
    if (totalXP >= levelToXpThreshold(level)) return level
  }
  return 1
}
