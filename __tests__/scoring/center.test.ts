import { describe, it, expect } from 'vitest'
import { computeDistanceToCenter, NEUTRAL_POINT } from '../../lib/scoring/center'

const N = NEUTRAL_POINT  // 100/3 ≈ 33.33

describe('computeDistanceToCenter', () => {
  it('returns zero for all neutral dimensions', () => {
    const r = computeDistanceToCenter({ D: N, I: N, S: N, C: N })
    expect(r.D).toBe(0)
    expect(r.I).toBe(0)
    expect(r.S).toBe(0)
    expect(r.C).toBe(0)
  })

  it('returns correct distance for dimension above center', () => {
    const r = computeDistanceToCenter({ D: N + 30, I: N, S: N, C: N })
    expect(r.D).toBeCloseTo(30)
    expect(r.I).toBe(0)
  })

  it('returns correct distance for dimension below center', () => {
    const r = computeDistanceToCenter({ D: N - 20, I: N, S: N, C: N })
    expect(r.D).toBeCloseTo(20)
  })

  it('absolute value: deficit and excess of same magnitude give same distance', () => {
    const above = computeDistanceToCenter({ D: N + 30, I: N, S: N, C: N })
    const below = computeDistanceToCenter({ D: N - 30, I: N, S: N, C: N })
    expect(above.D).toBeCloseTo(below.D)
    expect(above.D).toBeCloseTo(30)
  })

  it('returns correct distances for mixed profile', () => {
    const r = computeDistanceToCenter({ D: N - 20, I: N + 40, S: N - 10, C: N + 15 })
    expect(r.D).toBeCloseTo(20)
    expect(r.I).toBeCloseTo(40)
    expect(r.S).toBeCloseTo(10)
    expect(r.C).toBeCloseTo(15)
  })

  it('handles extreme values: 0 is N below center, 100 is (100-N) above center', () => {
    const r = computeDistanceToCenter({ D: 0, I: 100, S: 0, C: 100 })
    expect(r.D).toBeCloseTo(N)
    expect(r.I).toBeCloseTo(100 - N)
    expect(r.S).toBeCloseTo(N)
    expect(r.C).toBeCloseTo(100 - N)
  })

  it('neutral point is 100/3, not 50: a score of 50 is above center', () => {
    const r = computeDistanceToCenter({ D: 50, I: N, S: N, C: N })
    expect(r.D).toBeCloseTo(50 - N)  // ≈ 16.67, not 0
    expect(r.I).toBe(0)
  })
})
