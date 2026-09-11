import { describe, it, expect } from 'vitest'
import { computeConsistency } from '../../lib/scoring/consistency'
import type { BlockResponseInput } from '../../lib/scoring/types'

function makeBlock2(
  g1Most: 'D'|'I'|'S'|'C', g1Least: 'D'|'I'|'S'|'C',
  g7Most: 'D'|'I'|'S'|'C', g7Least: 'D'|'I'|'S'|'C',
  duration = 300
): { groups: BlockResponseInput[]; duration: number } {
  const groups: BlockResponseInput[] = [
    { groupNumber: 1, mostDim: g1Most, leastDim: g1Least, isControl: false },
    { groupNumber: 2, mostDim: 'I', leastDim: 'S', isControl: false },
    { groupNumber: 3, mostDim: 'S', leastDim: 'C', isControl: false },
    { groupNumber: 4, mostDim: 'C', leastDim: 'D', isControl: false },
    { groupNumber: 5, mostDim: 'I', leastDim: 'S', isControl: false },
    { groupNumber: 6, mostDim: 'D', leastDim: 'I', isControl: false },
    { groupNumber: 7, mostDim: g7Most, leastDim: g7Least, isControl: true },
  ]
  return { groups, duration }
}

describe('computeConsistency', () => {
  it('0 contradictions → rawConsistency = 100, level HIGH', () => {
    const { groups, duration } = makeBlock2('D', 'I', 'D', 'S')
    const r = computeConsistency(groups, duration)
    expect(r.contradictions).toBe(0)
    expect(r.rawConsistency).toBe(100)
    expect(r.consistencyIndex).toBe(100)
    expect(r.level).toBe('HIGH')
  })
  it('1 contradiction in most → rawConsistency = 50', () => {
    const { groups, duration } = makeBlock2('D', 'I', 'I', 'S')
    const r = computeConsistency(groups, duration)
    expect(r.contradictions).toBe(1)
    expect(r.rawConsistency).toBe(50)
    expect(r.level).toBe('LOW')
  })
  it('1 contradiction in least → rawConsistency = 50', () => {
    const { groups, duration } = makeBlock2('D', 'I', 'S', 'D')
    const r = computeConsistency(groups, duration)
    expect(r.contradictions).toBe(1)
    expect(r.rawConsistency).toBe(50)
  })
  it('2 contradictions → rawConsistency = 0', () => {
    const { groups, duration } = makeBlock2('D', 'I', 'I', 'D')
    const r = computeConsistency(groups, duration)
    expect(r.contradictions).toBe(2)
    expect(r.rawConsistency).toBe(0)
    expect(r.level).toBe('LOW')
  })
  it('time < 3min caps consistencyIndex at 60', () => {
    const { groups } = makeBlock2('D', 'I', 'D', 'S')
    const r = computeConsistency(groups, 150)
    expect(r.rawConsistency).toBe(100)
    expect(r.consistencyIndex).toBe(60)
    expect(r.level).toBe('MODERATE')
  })
  it('time exactly 180s (3min) does NOT cap', () => {
    const { groups } = makeBlock2('D', 'I', 'D', 'S')
    const r = computeConsistency(groups, 180)
    expect(r.consistencyIndex).toBe(100)
  })
  it('throws if group1 or group7 missing', () => {
    expect(() => computeConsistency([], 300)).toThrow()
  })
})
