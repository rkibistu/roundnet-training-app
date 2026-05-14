import { describe, it, expect } from 'vitest'
import { levelToXpThreshold, xpToLevel } from '../src/levelEngine.js'

describe('xpToLevel', () => {
  it('returns level 1 for 0 XP', () => {
    expect(xpToLevel(0)).toBe(1)
  })

  it('returns level 10 for 180 XP', () => {
    expect(xpToLevel(180)).toBe(10)
  })

  it('returns level 20 for 540 XP', () => {
    expect(xpToLevel(540)).toBe(20)
  })

  it('returns level 100 for very large XP (clamp at max level)', () => {
    expect(xpToLevel(10_000_000)).toBe(100)
  })

  it('levelToXpThreshold(xpToLevel(n)) is always <= n (consistent inverses)', () => {
    for (const xp of [0, 1, 50, 179, 180, 181, 539, 540, 541, 5000, 99999]) {
      const level = xpToLevel(xp)
      expect(levelToXpThreshold(level)).toBeLessThanOrEqual(xp)
    }
  })
})

describe('levelToXpThreshold', () => {
  it('returns 0 XP for level 1', () => {
    expect(levelToXpThreshold(1)).toBe(0)
  })

  it('returns 180 XP for level 10', () => {
    expect(levelToXpThreshold(10)).toBe(180)
  })

  it('returns 540 XP for level 20', () => {
    expect(levelToXpThreshold(20)).toBe(540)
  })
})
