import { describe, it, expect } from 'vitest'
import { computeConsistency } from '../../lib/scoring/consistency'
import type { WordSelectionInput } from '../../lib/scoring/types'

// 12 control pairs (3 per dimension):
// D: ctrl_D↔D1, ctrl_D2↔D2, ctrl_D4↔D4
// I: ctrl_I↔I1, ctrl_I2↔I2, ctrl_I3↔I3
// S: ctrl_S↔S1, ctrl_S3↔S3, ctrl_S4↔S4
// C: ctrl_C↔C1, ctrl_C4↔C4, ctrl_C5↔C5

const INFO: Record<string, { dim: 'D'|'I'|'S'|'C'; isControl: boolean }> = {
  D1: { dim:'D', isControl:false }, D2: { dim:'D', isControl:false },
  D3: { dim:'D', isControl:false }, D4: { dim:'D', isControl:false },
  I1: { dim:'I', isControl:false }, I2: { dim:'I', isControl:false },
  I3: { dim:'I', isControl:false },
  S1: { dim:'S', isControl:false }, S3: { dim:'S', isControl:false },
  S4: { dim:'S', isControl:false },
  C1: { dim:'C', isControl:false }, C4: { dim:'C', isControl:false },
  C5: { dim:'C', isControl:false },
  ctrl_D:  { dim:'D', isControl:true }, ctrl_D2: { dim:'D', isControl:true },
  ctrl_D4: { dim:'D', isControl:true },
  ctrl_I:  { dim:'I', isControl:true }, ctrl_I2: { dim:'I', isControl:true },
  ctrl_I3: { dim:'I', isControl:true },
  ctrl_S:  { dim:'S', isControl:true }, ctrl_S3: { dim:'S', isControl:true },
  ctrl_S4: { dim:'S', isControl:true },
  ctrl_C:  { dim:'C', isControl:true }, ctrl_C4: { dim:'C', isControl:true },
  ctrl_C5: { dim:'C', isControl:true },
}

function sel(keys: string[]): WordSelectionInput[] {
  return keys.map(k => ({ wordKey: k, dimension: INFO[k].dim, isControl: INFO[k].isControl }))
}

// All 12 main anchor words selected
const ALL_MAIN = ['D1','D2','D4','I1','I2','I3','S1','S3','S4','C1','C4','C5']
// All 12 control words selected
const ALL_CTRL = ['ctrl_D','ctrl_D2','ctrl_D4','ctrl_I','ctrl_I2','ctrl_I3',
                  'ctrl_S','ctrl_S3','ctrl_S4','ctrl_C','ctrl_C4','ctrl_C5']

describe('computeConsistency — 12 pairs', () => {
  it('0 contradictions (all 12 pairs: both marked) → rawConsistency=100, HIGH', () => {
    const r = computeConsistency(sel([...ALL_MAIN, ...ALL_CTRL]))
    expect(r.contradictions).toBe(0)
    expect(r.rawConsistency).toBe(100)
    expect(r.level).toBe('HIGH')
  })
  it('0 contradictions (none of any pair marked) → rawConsistency=100, HIGH', () => {
    const r = computeConsistency(sel(['D3']))
    expect(r.contradictions).toBe(0)
    expect(r.rawConsistency).toBe(100)
  })
  it('1 contradiction → rawConsistency ≈ 91.67, HIGH', () => {
    // ctrl_D marked, D1 not marked → 1 contradiction
    const r = computeConsistency(sel(['ctrl_D', 'D2', 'ctrl_D2']))
    expect(r.contradictions).toBe(1)
    expect(r.rawConsistency).toBeCloseTo((11 / 12) * 100, 6)
    expect(r.level).toBe('HIGH')
  })
  it('3 contradictions → rawConsistency=75, HIGH (boundary)', () => {
    // ctrl_D, ctrl_D2, ctrl_D4 marked — their anchors D1, D2, D4 NOT marked
    const r = computeConsistency(sel(['ctrl_D', 'ctrl_D2', 'ctrl_D4']))
    expect(r.contradictions).toBe(3)
    expect(r.rawConsistency).toBeCloseTo(75, 6)
    expect(r.level).toBe('HIGH')
  })
  it('4 contradictions → rawConsistency ≈ 66.67, MODERATE', () => {
    const r = computeConsistency(sel(['ctrl_D', 'ctrl_D2', 'ctrl_D4', 'ctrl_I']))
    expect(r.contradictions).toBe(4)
    expect(r.rawConsistency).toBeCloseTo((8 / 12) * 100, 6)
    expect(r.level).toBe('MODERATE')
  })
  it('6 contradictions → rawConsistency=50, MODERATE (boundary)', () => {
    // 6 controls marked, none of their anchors
    const r = computeConsistency(
      sel(['ctrl_D','ctrl_D2','ctrl_D4','ctrl_I','ctrl_I2','ctrl_I3'])
    )
    expect(r.contradictions).toBe(6)
    expect(r.rawConsistency).toBeCloseTo(50, 6)
    expect(r.level).toBe('MODERATE')
  })
  it('7 contradictions → rawConsistency ≈ 41.67, LOW', () => {
    const r = computeConsistency(
      sel(['ctrl_D','ctrl_D2','ctrl_D4','ctrl_I','ctrl_I2','ctrl_I3','ctrl_S'])
    )
    expect(r.contradictions).toBe(7)
    expect(r.rawConsistency).toBeCloseTo((5 / 12) * 100, 6)
    expect(r.level).toBe('LOW')
  })
  it('12 contradictions → rawConsistency=0, LOW', () => {
    // All controls marked, none of their anchors
    const r = computeConsistency(sel(ALL_CTRL))
    expect(r.contradictions).toBe(12)
    expect(r.rawConsistency).toBeCloseTo(0, 6)
    expect(r.level).toBe('LOW')
  })
  it('consistencyIndex equals rawConsistency (no time cap)', () => {
    const r = computeConsistency(sel([...ALL_MAIN, ...ALL_CTRL]))
    expect(r.consistencyIndex).toBe(r.rawConsistency)
  })
  it('HIGH threshold: ≥75', () => {
    // Exactly 75 (3 contradictions) → HIGH
    const r = computeConsistency(sel(['ctrl_D', 'ctrl_D2', 'ctrl_D4']))
    expect(r.level).toBe('HIGH')
  })
  it('MODERATE threshold: 50–74', () => {
    // 4 contradictions → ~66.67 → MODERATE
    const r = computeConsistency(sel(['ctrl_D', 'ctrl_D2', 'ctrl_D4', 'ctrl_I']))
    expect(r.level).toBe('MODERATE')
  })
  it('LOW threshold: <50', () => {
    // 7 contradictions → ~41.67 → LOW
    const r = computeConsistency(
      sel(['ctrl_D','ctrl_D2','ctrl_D4','ctrl_I','ctrl_I2','ctrl_I3','ctrl_S'])
    )
    expect(r.level).toBe('LOW')
  })
})
