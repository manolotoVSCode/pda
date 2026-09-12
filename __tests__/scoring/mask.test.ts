import { describe, it, expect } from 'vitest'
import { euclidean, computeMaskIndex } from '../../lib/scoring/mask'
import type { DimensionVector } from '../../lib/scoring/types'

const v0:   DimensionVector = { D: 0,   I: 0,      S: 0,   C: 0      }
const v50:  DimensionVector = { D: 50,  I: 50,     S: 50,  C: 50     }
const v100: DimensionVector = { D: 100, I: 100,    S: 100, C: 100    }

// Maximum achievable under 8-word budget: 6D+2I vs 6S+2C
// euclidean = √(100² + (100/3)² + 100² + (100/3)²) = √22222.22 ≈ 149.0712
const ppMax: DimensionVector = { D: 100, I: 100 / 3, S: 0,   C: 0       }
const piMax: DimensionVector = { D: 0,   I: 0,       S: 100, C: 100 / 3 }

describe('euclidean', () => {
  it('identical vectors → 0', () =>
    expect(euclidean(v100, v100)).toBe(0))
  it('all-zero vectors → 0', () =>
    expect(euclidean(v0, v0)).toBe(0))
  it('opposite extremes (unrealistic) → 200', () =>
    expect(euclidean(v100, v0)).toBeCloseTo(200, 8))
  it('known case: two dims differ by 100', () => {
    const a: DimensionVector = { D: 100, I: 0, S: 50, C: 50 }
    const b: DimensionVector = { D: 0, I: 100, S: 50, C: 50 }
    expect(euclidean(a, b)).toBeCloseTo(Math.sqrt(20000), 8)
  })
  it('budget-maximum case → ≈ 149.0712', () =>
    expect(euclidean(ppMax, piMax)).toBeCloseTo(149.0712, 2))
})

describe('computeMaskIndex', () => {
  it('identical PP and PI → maskIndex = 0', () =>
    expect(computeMaskIndex(v50, v50)).toBe(0))
  it('budget-maximum inputs → maskIndex ≈ 100', () =>
    expect(computeMaskIndex(ppMax, piMax)).toBeCloseTo(100, 2))
  it('maskIndex ≥ 0 for all valid inputs', () => {
    const cases: [DimensionVector, DimensionVector][] = [
      [{ D: 100, I: 33.33, S: 0, C: 0 },    { D: 0, I: 66.67, S: 33.33, C: 0 }],
      [{ D: 66.67, I: 66.67, S: 0, C: 0 },  { D: 0, I: 0, S: 100, C: 33.33 }],
      [{ D: 100, I: 0, S: 0, C: 33.33 },    { D: 0, I: 100, S: 33.33, C: 0 }],
      [v50, v50],
      [v0, v0],
    ]
    for (const [pp, pi] of cases) {
      expect(computeMaskIndex(pp, pi)).toBeGreaterThanOrEqual(0)
    }
  })
  it('maskIndex ≤ 100 for all budget-valid inputs', () => {
    // Exhaustive-style spot check of realistic selections (k/6 × 100 per dim, total k=8)
    const cases: [DimensionVector, DimensionVector][] = [
      [ppMax, piMax],
      [{ D: 100, I: 0, S: 0, C: 33.33 }, { D: 0, I: 100, S: 33.33, C: 0 }],
      [{ D: 66.67, I: 66.67, S: 0, C: 0 }, { D: 0, I: 0, S: 66.67, C: 66.67 }],
      [{ D: 33.33, I: 33.33, S: 33.33, C: 33.33 }, v50],
    ]
    for (const [pp, pi] of cases) {
      expect(computeMaskIndex(pp, pi)).toBeLessThanOrEqual(100.001)
    }
  })
})
