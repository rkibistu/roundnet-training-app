import { describe, it, expect } from 'vitest'
import { calculateXP } from '../src/xpEngine.js'

describe('calculateXP', () => {
  it('returns duration × 1.0 for quality score 3', () => {
    expect(calculateXP(60, 3)).toBe(60)
  })

  it('returns duration × 0.5 for quality score 1', () => {
    expect(calculateXP(60, 1)).toBe(30)
  })

  it('returns duration × 0.75 for quality score 2', () => {
    expect(calculateXP(60, 2)).toBe(45)
  })

  it('returns duration × 1.25 for quality score 4', () => {
    expect(calculateXP(60, 4)).toBe(75)
  })

  it('returns duration × 1.5 for quality score 5', () => {
    expect(calculateXP(60, 5)).toBe(90)
  })

  it('returns 0 for 0-minute sessions regardless of quality score', () => {
    expect(calculateXP(0, 1)).toBe(0)
    expect(calculateXP(0, 5)).toBe(0)
  })
})
