import { describe, it, expect } from 'vitest'
import { computeComposite } from '../../lib/scoring/composite'
import type { DimensionVector } from '../../lib/scoring/types'

const v100: DimensionVector = { D: 100, I: 100, S: 100, C: 100 }
const v0:   DimensionVector = { D: 0,   I: 0,   S: 0,   C: 0   }
const v50:  DimensionVector = { D: 50,  I: 50,  S: 50,  C: 50  }

describe('computeComposite — PT defined', () => {
  it('all vectors at 100 → composite at 100', () =>
    expect(computeComposite(v100, v100, v100).D).toBe(100))
  it('all vectors at 0 → composite at 0', () =>
    expect(computeComposite(v0, v0, v0).D).toBe(0))
  it('PI=100, PP=0, PT=0 → 60', () =>
    expect(computeComposite(v100, v0, v0).D).toBeCloseTo(60, 10))
  it('PI=0, PP=100, PT=0 → 25', () =>
    expect(computeComposite(v0, v100, v0).D).toBeCloseTo(25, 10))
  it('PI=0, PP=0, PT=100 → 15', () =>
    expect(computeComposite(v0, v0, v100).D).toBeCloseTo(15, 10))
  it('all at 50 → composite at 50', () =>
    expect(computeComposite(v50, v50, v50).D).toBe(50))
  it('computes each dimension independently', () => {
    const pi: DimensionVector = { D: 100, I: 0, S: 0, C: 0 }
    const pp: DimensionVector = { D: 0, I: 100, S: 0, C: 0 }
    const pt: DimensionVector = { D: 0, I: 0, S: 100, C: 0 }
    const r = computeComposite(pi, pp, pt)
    expect(r.D).toBeCloseTo(60, 10)
    expect(r.I).toBeCloseTo(25, 10)
    expect(r.S).toBeCloseTo(15, 10)
    expect(r.C).toBe(0)
  })
  it('weights sum to 1: PI×0.60 + PP×0.25 + PT×0.15 = 1.00', () => {
    // Verified by: 100×0.60 + 100×0.25 + 100×0.15 = 100
    expect(computeComposite(v100, v100, v100).D).toBeCloseTo(100, 10)
  })
})

describe('computeComposite — PT undefined (null)', () => {
  it('PI=100, PP=0, null PT → 100 × (12/17) ≈ 70.59', () =>
    expect(computeComposite(v100, v0, null).D).toBeCloseTo(100 * 12 / 17, 8))
  it('PI=0, PP=100, null PT → 100 × (5/17) ≈ 29.41', () =>
    expect(computeComposite(v0, v100, null).D).toBeCloseTo(100 * 5 / 17, 8))
  it('PI=100, PP=100, null PT → 100', () =>
    expect(computeComposite(v100, v100, null).D).toBeCloseTo(100, 8))
  it('PI=0, PP=0, null PT → 0', () =>
    expect(computeComposite(v0, v0, null).D).toBe(0))
  it('redistributed weights sum to 1: 12/17 + 5/17 = 1', () =>
    expect(computeComposite(v100, v100, null).D).toBeCloseTo(100, 10))
  it('null PT — each dimension computed independently', () => {
    const pi: DimensionVector = { D: 100, I: 0, S: 0, C: 0 }
    const pp: DimensionVector = { D: 0, I: 100, S: 0, C: 0 }
    const r = computeComposite(pi, pp, null)
    expect(r.D).toBeCloseTo(100 * 12 / 17, 8)
    expect(r.I).toBeCloseTo(100 * 5 / 17, 8)
    expect(r.S).toBe(0)
    expect(r.C).toBe(0)
  })
})
