import { describe, it, expect } from 'vitest'
import { rawScore, normalizeScore, computeProfileVector } from '../../lib/scoring/normalize'
import type { BlockResponseInput } from '../../lib/scoring/types'

const makeResp = (
  g: number,
  most: 'D'|'I'|'S'|'C',
  least: 'D'|'I'|'S'|'C'
): BlockResponseInput => ({ groupNumber: g, mostDim: most, leastDim: least, isControl: false })

describe('normalizeScore', () => {
  it('maps -6 to exactly 0', () => expect(normalizeScore(-6)).toBe(0))
  it('maps 0 to exactly 50', () => expect(normalizeScore(0)).toBe(50))
  it('maps +6 to exactly 100', () => expect(normalizeScore(6)).toBe(100))
  it('maps -3 to exactly 25', () => expect(normalizeScore(-3)).toBe(25))
  it('maps +3 to exactly 75', () => expect(normalizeScore(3)).toBe(75))
  it('maps -5 to 8.333... without rounding', () =>
    expect(normalizeScore(-5)).toBeCloseTo(100 / 12, 10))
  it('maps +1 to 58.333...', () =>
    expect(normalizeScore(1)).toBeCloseTo(700 / 12, 10))
})

describe('rawScore', () => {
  it('returns +6 when all 6 groups mark D as most', () => {
    const r = [1,2,3,4,5,6].map(g => makeResp(g, 'D', 'I'))
    expect(rawScore(r, 'D')).toBe(6)
  })
  it('returns -6 when all 6 groups mark D as least', () => {
    const r = [1,2,3,4,5,6].map(g => makeResp(g, 'I', 'D'))
    expect(rawScore(r, 'D')).toBe(-6)
  })
  it('returns 0 for 3 most + 3 least', () => {
    const r = [
      makeResp(1, 'D', 'I'), makeResp(2, 'D', 'I'), makeResp(3, 'D', 'I'),
      makeResp(4, 'I', 'D'), makeResp(5, 'I', 'D'), makeResp(6, 'I', 'D'),
    ]
    expect(rawScore(r, 'D')).toBe(0)
  })
  it('ignores other dimensions', () => {
    const r = [makeResp(1, 'I', 'S')]
    expect(rawScore(r, 'D')).toBe(0)
  })
})

describe('computeProfileVector', () => {
  it('produces correct vector when all groups mark D as most and I as least', () => {
    const r = [1,2,3,4,5,6].map(g => makeResp(g, 'D', 'I'))
    const v = computeProfileVector(r)
    expect(v.D).toBe(100)
    expect(v.I).toBe(0)
    expect(v.S).toBe(50)
    expect(v.C).toBe(50)
  })
  it('produces 50 for all dimensions when responses cancel out', () => {
    const r = [
      makeResp(1, 'D', 'I'), makeResp(2, 'I', 'D'),
      makeResp(3, 'S', 'C'), makeResp(4, 'C', 'S'),
      makeResp(5, 'D', 'I'), makeResp(6, 'I', 'D'),
    ]
    const v = computeProfileVector(r)
    expect(v.D).toBe(50)
    expect(v.I).toBe(50)
  })
})
