import { describe, it, expect } from 'vitest'
import { euclidean, computeMaskIndex } from '../../lib/scoring/mask'
import type { DimensionVector } from '../../lib/scoring/types'

const v100: DimensionVector = { D: 100, I: 100, S: 100, C: 100 }
const v0: DimensionVector = { D: 0, I: 0, S: 0, C: 0 }
const v50: DimensionVector = { D: 50, I: 50, S: 50, C: 50 }

describe('euclidean', () => {
  it('identical vectors → 0', () => expect(euclidean(v100, v100)).toBe(0))
  it('opposite extremes → 200', () =>
    expect(euclidean(v100, v0)).toBeCloseTo(200, 8))
  it('known case: two dims differ by 100', () => {
    const a: DimensionVector = { D: 100, I: 0, S: 50, C: 50 }
    const b: DimensionVector = { D: 0, I: 100, S: 50, C: 50 }
    expect(euclidean(a, b)).toBeCloseTo(Math.sqrt(20000), 8)
  })
})

describe('computeMaskIndex', () => {
  it('identical PP and PI → maskIndex = 0', () =>
    expect(computeMaskIndex(v50, v50)).toBe(0))
  it('opposite PP and PI → maskIndex = 100', () =>
    expect(computeMaskIndex(v100, v0)).toBeCloseTo(100, 8))
  it('maskIndex stays in [0, 100]', () => {
    const a: DimensionVector = { D: 80, I: 20, S: 60, C: 40 }
    const b: DimensionVector = { D: 30, I: 70, S: 45, C: 55 }
    const idx = computeMaskIndex(a, b)
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(idx).toBeLessThanOrEqual(100)
  })
})
