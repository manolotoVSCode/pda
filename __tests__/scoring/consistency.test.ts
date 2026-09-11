import { describe, it, expect } from 'vitest'
import { computeConsistency } from '../../lib/scoring/consistency'
import type { WordSelectionInput } from '../../lib/scoring/types'

// Control pairs: ctrl_D↔D1, ctrl_I↔I1, ctrl_S↔S1, ctrl_C↔C1
const INFO: Record<string, { dim: 'D'|'I'|'S'|'C'; isControl: boolean }> = {
  D1: { dim:'D', isControl:false }, D2: { dim:'D', isControl:false }, D3: { dim:'D', isControl:false },
  I1: { dim:'I', isControl:false }, S1: { dim:'S', isControl:false }, C1: { dim:'C', isControl:false },
  ctrl_D: { dim:'D', isControl:true }, ctrl_I: { dim:'I', isControl:true },
  ctrl_S: { dim:'S', isControl:true }, ctrl_C: { dim:'C', isControl:true },
}

function sel(keys: string[]): WordSelectionInput[] {
  return keys.map(k => ({ wordKey: k, dimension: INFO[k].dim, isControl: INFO[k].isControl }))
}

describe('computeConsistency', () => {
  it('0 contradictions (all pairs: both marked) → HIGH', () => {
    const r = computeConsistency(sel(['D1','ctrl_D','I1','ctrl_I','S1','ctrl_S','C1','ctrl_C','D2']), 300)
    expect(r.contradictions).toBe(0)
    expect(r.rawConsistency).toBe(100)
    expect(r.level).toBe('HIGH')
  })
  it('0 contradictions (all pairs: both unmarked)', () => {
    const r = computeConsistency(sel(['D2','D3']), 300)
    expect(r.contradictions).toBe(0)
    expect(r.rawConsistency).toBe(100)
  })
  it('1 contradiction (ctrl_D marked, D1 not) → rawConsistency=75, MODERATE', () => {
    const r = computeConsistency(sel(['ctrl_D','I1','ctrl_I','S1','ctrl_S','C1','ctrl_C','D2','D3']), 300)
    expect(r.contradictions).toBe(1)
    expect(r.rawConsistency).toBe(75)
    expect(r.level).toBe('MODERATE')
  })
  it('2 contradictions → rawConsistency=50, LOW', () => {
    const r = computeConsistency(sel(['ctrl_D','ctrl_I','D2','D3']), 300)
    expect(r.contradictions).toBe(2)
    expect(r.rawConsistency).toBe(50)
    expect(r.level).toBe('LOW')
  })
  it('4 contradictions → rawConsistency=0, LOW', () => {
    const r = computeConsistency(sel(['ctrl_D','ctrl_I','ctrl_S','ctrl_C','D2']), 300)
    expect(r.contradictions).toBe(4)
    expect(r.rawConsistency).toBe(0)
    expect(r.level).toBe('LOW')
  })
  it('time < 3min caps at 60', () => {
    const r = computeConsistency(sel(['D1','ctrl_D','I1','ctrl_I','S1','ctrl_S','C1','ctrl_C','D2']), 150)
    expect(r.rawConsistency).toBe(100)
    expect(r.consistencyIndex).toBe(60)
    expect(r.level).toBe('MODERATE')
  })
  it('time exactly 180s does NOT cap', () => {
    const r = computeConsistency(sel(['D1','ctrl_D','I1','ctrl_I','S1','ctrl_S','C1','ctrl_C','D2']), 180)
    expect(r.consistencyIndex).toBe(100)
  })
})
