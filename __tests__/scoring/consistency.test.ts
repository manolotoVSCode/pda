import { describe, it, expect } from 'vitest'
import { computeConsistency } from '../../lib/scoring/consistency'
import type { WordSelectionInput } from '../../lib/scoring/types'

/**
 * Dimension-level consistency model (combined two-mechanism design):
 *
 * PRIMARY INDEX — for each of the 12 control words:
 *   contradiction if: ctrl=YES and k_dim=0 (endorsed control but skipped whole dimension)
 *   contradiction if: ctrl=NO  and k_dim>0 (rejected control but endorsed the dimension)
 *   k_dim = count of non-control words selected for that control's dimension
 *
 * UNIFORM-PATTERN OVERRIDE — if all 12 controls identical (all YES or all NO):
 *   level forced to LOW regardless of primary index
 */

const INFO: Record<string, { dim: 'D'|'I'|'S'|'C'; isControl: boolean }> = {
  // Main (non-control) words
  D1: { dim:'D', isControl:false }, D2: { dim:'D', isControl:false },
  D3: { dim:'D', isControl:false }, D4: { dim:'D', isControl:false },
  I1: { dim:'I', isControl:false }, I2: { dim:'I', isControl:false },
  I3: { dim:'I', isControl:false },
  S1: { dim:'S', isControl:false }, S3: { dim:'S', isControl:false },
  C1: { dim:'C', isControl:false }, C4: { dim:'C', isControl:false },
  // Control words (3 per dimension)
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

const ALL_CTRL = [
  'ctrl_D','ctrl_D2','ctrl_D4',
  'ctrl_I','ctrl_I2','ctrl_I3',
  'ctrl_S','ctrl_S3','ctrl_S4',
  'ctrl_C','ctrl_C4','ctrl_C5',
]

// ---------------------------------------------------------------------------
// Uniform-pattern override: all 12 controls identical → forced LOW
// ---------------------------------------------------------------------------
describe('computeConsistency — uniform-pattern override', () => {
  it('all 12 controls selected (all YES) → forced LOW regardless of k_dim', () => {
    // k_D=2, k_I=2, k_S=1, k_C=1 → normally 0 D/I contradictions, but override fires
    const r = computeConsistency(sel([
      'D1','D2','I1','I2','S1','C1', ...ALL_CTRL,
    ]))
    expect(r.level).toBe('LOW')
  })

  it('all 12 controls selected with no mains → forced LOW', () => {
    const r = computeConsistency(sel(ALL_CTRL))
    expect(r.level).toBe('LOW')
  })

  it('no controls selected (all NO) with mains present → forced LOW', () => {
    // k_D=1, k_I=1 but 0 controls → uniform NO → LOW
    const r = computeConsistency(sel(['D1', 'I1']))
    expect(r.level).toBe('LOW')
  })

  it('no controls selected, no mains → forced LOW (all NO)', () => {
    const r = computeConsistency(sel([]))
    expect(r.level).toBe('LOW')
  })

  it('1 control selected → no override (not all-identical)', () => {
    // With 1 ctrl selected the pattern is mixed, so override does NOT fire
    const r = computeConsistency(sel(['D1', 'ctrl_D']))
    expect(r.level).not.toBe('LOW')   // should be HIGH or MODERATE, not override-LOW
  })

  it('11 controls selected with matching mains → no override (result is HIGH)', () => {
    // k_D=k_I=k_S=k_C=1; all controls except ctrl_C5 selected → 1 contradiction, HIGH
    // If uniform override fired (it must NOT for 11 controls) this would be LOW instead
    const r = computeConsistency(sel([
      'D1', 'ctrl_D', 'ctrl_D2', 'ctrl_D4',
      'I1', 'ctrl_I', 'ctrl_I2', 'ctrl_I3',
      'S1', 'ctrl_S', 'ctrl_S3', 'ctrl_S4',
      'C1', 'ctrl_C', 'ctrl_C4',  // ctrl_C5 absent → 1 contradiction
    ]))
    expect(r.contradictions).toBe(1)
    expect(r.level).toBe('HIGH')
  })
})

// ---------------------------------------------------------------------------
// Contradiction counting (dimension-level matching, no uniform override)
// Tests are constructed so selectedCtrlCount is 1–11 to prevent override.
// ---------------------------------------------------------------------------
describe('computeConsistency — contradiction counting', () => {
  /**
   * 0 contradictions:
   *   k_D=1, ctrl_D+ctrl_D2+ctrl_D4 selected → all 3 D controls consistent
   *   k_I=0, no I controls → all 3 I controls consistent (both absent)
   *   k_S=0, no S controls → consistent
   *   k_C=0, no C controls → consistent
   *   selectedCtrlCount=3, rawConsistency=100
   */
  it('0 contradictions → rawConsistency=100, HIGH', () => {
    const r = computeConsistency(sel(['D1', 'ctrl_D', 'ctrl_D2', 'ctrl_D4']))
    expect(r.contradictions).toBe(0)
    expect(r.rawConsistency).toBe(100)
    expect(r.level).toBe('HIGH')
  })

  /**
   * 3 contradictions (index=75, HIGH boundary):
   *   k_D=1, ctrl_D+ctrl_D2 selected, ctrl_D4 NOT → 1 D contradiction
   *   k_I=0, ctrl_I selected → 1 I contradiction (ctrl YES, k_I=0)
   *   k_S=0, ctrl_S selected → 1 S contradiction (ctrl YES, k_S=0)
   *   k_C=0, no C controls → 0
   *   selectedCtrlCount=5
   */
  it('3 contradictions → rawConsistency=75, HIGH (boundary)', () => {
    const r = computeConsistency(sel(['D1', 'ctrl_D', 'ctrl_D2', 'ctrl_I', 'ctrl_S']))
    expect(r.contradictions).toBe(3)
    expect(r.rawConsistency).toBeCloseTo(75, 6)
    expect(r.level).toBe('HIGH')
  })

  /**
   * 4 contradictions (index≈66.67, MODERATE):
   *   Same as above + ctrl_C selected (k_C=0) → 4th contradiction
   *   selectedCtrlCount=6
   */
  it('4 contradictions → rawConsistency≈66.67, MODERATE', () => {
    const r = computeConsistency(
      sel(['D1', 'ctrl_D', 'ctrl_D2', 'ctrl_I', 'ctrl_S', 'ctrl_C'])
    )
    expect(r.contradictions).toBe(4)
    expect(r.rawConsistency).toBeCloseTo((8 / 12) * 100, 6)
    expect(r.level).toBe('MODERATE')
  })

  /**
   * 6 contradictions (index=50, MODERATE boundary):
   *   k_D=1, ctrl_D+ctrl_D2+ctrl_D4 all selected → 0 D contradictions
   *   k_I=1, no I controls → 3 I contradictions (ctrl NO, k_I>0)
   *   k_S=0, ctrl_S+ctrl_S3 selected → 2 S contradictions (ctrl YES, k_S=0)
   *   k_C=0, ctrl_C selected → 1 C contradiction (ctrl YES, k_C=0)
   *   selectedCtrlCount=6
   */
  it('6 contradictions → rawConsistency=50, MODERATE (boundary)', () => {
    const r = computeConsistency(sel([
      'D1', 'ctrl_D', 'ctrl_D2', 'ctrl_D4',
      'I1',
      'ctrl_S', 'ctrl_S3',
      'ctrl_C',
    ]))
    expect(r.contradictions).toBe(6)
    expect(r.rawConsistency).toBeCloseTo(50, 6)
    expect(r.level).toBe('MODERATE')
  })

  /**
   * 7 contradictions (index≈41.67, LOW):
   *   Same + ctrl_C4 selected (k_C=0) → 7th contradiction
   *   selectedCtrlCount=7
   */
  it('7 contradictions → rawConsistency≈41.67, LOW', () => {
    const r = computeConsistency(sel([
      'D1', 'ctrl_D', 'ctrl_D2', 'ctrl_D4',
      'I1',
      'ctrl_S', 'ctrl_S3',
      'ctrl_C', 'ctrl_C4',
    ]))
    expect(r.contradictions).toBe(7)
    expect(r.rawConsistency).toBeCloseTo((5 / 12) * 100, 6)
    expect(r.level).toBe('LOW')
  })
})

// ---------------------------------------------------------------------------
// Level thresholds
// ---------------------------------------------------------------------------
describe('computeConsistency — level thresholds', () => {
  it('index=75 is HIGH (not MODERATE)', () => {
    const r = computeConsistency(sel(['D1', 'ctrl_D', 'ctrl_D2', 'ctrl_I', 'ctrl_S']))
    expect(r.level).toBe('HIGH')
  })

  it('index<75 (4 contradictions) is MODERATE', () => {
    const r = computeConsistency(
      sel(['D1', 'ctrl_D', 'ctrl_D2', 'ctrl_I', 'ctrl_S', 'ctrl_C'])
    )
    expect(r.level).toBe('MODERATE')
  })

  it('index=50 is MODERATE (not LOW)', () => {
    const r = computeConsistency(sel([
      'D1', 'ctrl_D', 'ctrl_D2', 'ctrl_D4',
      'I1',
      'ctrl_S', 'ctrl_S3',
      'ctrl_C',
    ]))
    expect(r.level).toBe('MODERATE')
  })

  it('index<50 (7 contradictions) is LOW', () => {
    const r = computeConsistency(sel([
      'D1', 'ctrl_D', 'ctrl_D2', 'ctrl_D4',
      'I1',
      'ctrl_S', 'ctrl_S3',
      'ctrl_C', 'ctrl_C4',
    ]))
    expect(r.level).toBe('LOW')
  })
})

// ---------------------------------------------------------------------------
// consistencyIndex equals rawConsistency (no additional penalty)
// ---------------------------------------------------------------------------
describe('computeConsistency — index equals raw', () => {
  it('consistencyIndex === rawConsistency for any result', () => {
    const r = computeConsistency(sel(['D1', 'ctrl_D', 'ctrl_D2', 'ctrl_I', 'ctrl_S']))
    expect(r.consistencyIndex).toBe(r.rawConsistency)
  })
})

// ---------------------------------------------------------------------------
// Real-world case: D=3, I=3, S=0, C=2 mains; no D controls, all I+C controls
// Expected: 3 contradictions (D-miss), index=75, HIGH
// ---------------------------------------------------------------------------
describe('computeConsistency — realistic profile', () => {
  it('k_D=3 with no D-controls, k_I=3 all I-controls, k_S=0 no S-controls, k_C=2 all C-controls → 3 contradictions, HIGH', () => {
    const r = computeConsistency(sel([
      // Mains: 3 D, 3 I, 0 S, 2 C
      'D1', 'D2', 'D3',
      'I1', 'I2', 'I3',
      'C1', 'C4',
      // Controls: none for D, all for I, none for S, all for C
      'ctrl_I', 'ctrl_I2', 'ctrl_I3',
      'ctrl_C', 'ctrl_C4', 'ctrl_C5',
    ]))
    // D: k_D=3, ctrl_D/ctrl_D2/ctrl_D4 all absent → 3 contradictions
    // I: k_I=3, all I controls present → 0 contradictions
    // S: k_S=0, no S controls → 0 contradictions
    // C: k_C=2, all C controls present → 0 contradictions
    expect(r.contradictions).toBe(3)
    expect(r.rawConsistency).toBeCloseTo(75, 6)
    expect(r.level).toBe('HIGH')
  })
})
