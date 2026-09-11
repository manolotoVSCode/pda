import { describe, it, expect } from 'vitest'
import { computeDistanceToCenter } from '../../lib/scoring/center'

describe('computeDistanceToCenter', () => {
  it('returns zero for all neutral dimensions', () => {
    expect(computeDistanceToCenter({ D: 50, I: 50, S: 50, C: 50 }))
      .toEqual({ D: 0, I: 0, S: 0, C: 0 })
  })

  it('returns correct distance for dimension above center', () => {
    const r = computeDistanceToCenter({ D: 75, I: 50, S: 50, C: 50 })
    expect(r.D).toBe(25)
    expect(r.I).toBe(0)
  })

  it('returns correct distance for dimension below center', () => {
    const r = computeDistanceToCenter({ D: 25, I: 50, S: 50, C: 50 })
    expect(r.D).toBe(25)
  })

  it('absolute value: deficit and excess of same magnitude give same distance', () => {
    const above = computeDistanceToCenter({ D: 80, I: 50, S: 50, C: 50 })
    const below = computeDistanceToCenter({ D: 20, I: 50, S: 50, C: 50 })
    expect(above.D).toBe(below.D)
    expect(above.D).toBe(30)
  })

  it('returns correct distances for mixed profile', () => {
    expect(computeDistanceToCenter({ D: 10, I: 90, S: 30, C: 70 }))
      .toEqual({ D: 40, I: 40, S: 20, C: 20 })
  })

  it('handles extreme values', () => {
    expect(computeDistanceToCenter({ D: 0, I: 100, S: 0, C: 100 }))
      .toEqual({ D: 50, I: 50, S: 50, C: 50 })
  })
})
