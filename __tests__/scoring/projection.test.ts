import { describe, it, expect } from 'vitest'
import { computeProjection } from '../../lib/scoring/projection'
import type { DimensionVector } from '../../lib/scoring/types'

const pc50: DimensionVector = { D: 50, I: 50, S: 50, C: 50 }

describe('computeProjection', () => {
  it('perfect conditions → projectionScore = 100, riskLevel LOW', () => {
    const pcHigh: DimensionVector = { D: 50, I: 50, S: 100, C: 100 }
    const r = computeProjection(100, 0, pcHigh)
    expect(r.projectionScore).toBeCloseTo(100, 8)
    expect(r.riskLevel).toBe('LOW')
  })
  it('worst conditions → projectionScore = 0, riskLevel HIGH', () => {
    const pc0: DimensionVector = { D: 50, I: 50, S: 0, C: 0 }
    const r = computeProjection(0, 100, pc0)
    expect(r.projectionScore).toBeCloseTo(0, 8)
    expect(r.riskLevel).toBe('HIGH')
  })
  it('fit=100, mask=0, stability=0 → 70', () => {
    const pc0: DimensionVector = { D: 50, I: 50, S: 0, C: 0 }
    const r = computeProjection(100, 0, pc0)
    expect(r.projectionScore).toBeCloseTo(70, 8)
  })
  it('fit=50, mask=50, stability=50 → 50, MEDIUM', () => {
    const r = computeProjection(50, 50, pc50)
    expect(r.projectionScore).toBeCloseTo(50, 8)
    expect(r.riskLevel).toBe('MEDIUM')
  })
  it('fit=0, mask=50, stability=50 → 25, HIGH', () => {
    const r = computeProjection(0, 50, pc50)
    expect(r.projectionScore).toBeCloseTo(25, 8)
    expect(r.riskLevel).toBe('HIGH')
  })
  it('stability component uses (S + C) / 2', () => {
    const pc: DimensionVector = { D: 0, I: 0, S: 80, C: 60 }
    const r = computeProjection(0, 100, pc)
    expect(r.projectionScore).toBeCloseTo(21, 8)
  })
  it('fit=100, mask=0, stability=50 → 85, LOW', () => {
    const r = computeProjection(100, 0, pc50)
    expect(r.projectionScore).toBeCloseTo(85, 8)
    expect(r.riskLevel).toBe('LOW')
  })
})
