import { describe, it, expect } from 'vitest'
import { computeFitScore } from '../../lib/scoring/fit'
import type { DimensionVector } from '../../lib/scoring/types'

const v100: DimensionVector = { D: 100, I: 100, S: 100, C: 100 }
const v0: DimensionVector = { D: 0, I: 0, S: 0, C: 0 }
const v50: DimensionVector = { D: 50, I: 50, S: 50, C: 50 }

describe('computeFitScore', () => {
  it('PC = ideal → fitScore = 100', () =>
    expect(computeFitScore(v50, v50)).toBeCloseTo(100, 8))
  it('PC opposite to ideal → fitScore = 0', () =>
    expect(computeFitScore(v100, v0)).toBeCloseTo(0, 8))
  it('result always in [0, 100]', () => {
    const fit = computeFitScore(
      { D: 100, I: 0, S: 100, C: 0 },
      { D: 0, I: 100, S: 0, C: 100 }
    )
    expect(fit).toBeGreaterThanOrEqual(0)
    expect(fit).toBeLessThanOrEqual(100)
  })
  it('mid-distance gives intermediate result', () => {
    const pc: DimensionVector = { D: 75, I: 75, S: 25, C: 25 }
    const ideal: DimensionVector = { D: 25, I: 25, S: 75, C: 75 }
    const fit = computeFitScore(pc, ideal)
    expect(fit).toBeGreaterThan(0)
    expect(fit).toBeLessThan(100)
  })
})
