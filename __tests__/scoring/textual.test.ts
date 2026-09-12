import { describe, it, expect } from 'vitest'
import { computeTextualProfile } from '../../lib/scoring/textual'
import type { LexiconEntry } from '../../lib/scoring/types'

// Test lexicon: two D terms + one per remaining dimension
const lex: LexiconEntry[] = [
  { dimension: 'D', term: 'decidido', weight: 3 },
  { dimension: 'D', term: 'directo',  weight: 3 },
  { dimension: 'I', term: 'sociable',   weight: 3 },
  { dimension: 'S', term: 'paciente',   weight: 3 },
  { dimension: 'C', term: 'meticuloso', weight: 3 },
]

// Relative normalization: PT[dim] = (4/3) × 100 × rawScore[dim] / totalSum
const FULL = (4 / 3) * 100        // 133.33... — when one dim holds all weight
const HALF = (4 / 3) * 100 * 0.5  //  66.67... — when two dims split weight equally

// ---------------------------------------------------------------------------
// Null conditions (PT undefined)
// ---------------------------------------------------------------------------
describe('computeTextualProfile — null conditions', () => {
  it('no matches → null', () => {
    expect(computeTextualProfile('nada relevante aqui', lex)).toBeNull()
  })
  it('empty text → null', () => {
    expect(computeTextualProfile('', lex)).toBeNull()
  })
  it('empty lexicon → null', () => {
    expect(computeTextualProfile('decidido sociable paciente meticuloso', [])).toBeNull()
  })
  it('1 distinct match → null (below 3-term threshold)', () => {
    expect(computeTextualProfile('soy decidido', lex)).toBeNull()
  })
  it('2 distinct matches → null (below 3-term threshold)', () => {
    expect(computeTextualProfile('decidido sociable', lex)).toBeNull()
  })
  it('3 repetitions of same term → still 1 distinct match → null', () => {
    expect(computeTextualProfile('decidido decidido decidido', lex)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Minimum threshold boundary
// ---------------------------------------------------------------------------
describe('computeTextualProfile — 3-term threshold', () => {
  it('exactly 3 distinct matches → defined (not null)', () => {
    const r = computeTextualProfile('decidido sociable paciente', lex)
    expect(r).not.toBeNull()
  })
  it('4 distinct matches → defined', () => {
    const r = computeTextualProfile('decidido sociable paciente meticuloso', lex)
    expect(r).not.toBeNull()
  })
  it('both D terms + 1 other = 3 matches → defined', () => {
    const r = computeTextualProfile('decidido directo sociable', lex)
    expect(r).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Normalization correctness (requires ≥ 3 matches to be non-null)
// ---------------------------------------------------------------------------
describe('computeTextualProfile — normalization', () => {
  it('sum of all PT dimensions = 133.33 for any valid result', () => {
    const texts = [
      'decidido sociable paciente',
      'decidido directo sociable',
      'decidido sociable paciente meticuloso',
    ]
    for (const t of texts) {
      const r = computeTextualProfile(t, lex)!
      expect(r).not.toBeNull()
      expect(r.D + r.I + r.S + r.C).toBeCloseTo(FULL, 6)
    }
  })

  it('one dominant dim with 3+ matches: dominant dim ≈ 133.33, others = 0', () => {
    // decidido + directo both D; sociable anchors 3rd match
    // raw: D=6, I=3, S=0, C=0 → total=9; PT.D=(4/3)×100×6/9=88.89, PT.I=44.44
    const r = computeTextualProfile('decidido directo sociable', lex)!
    expect(r.D).toBeCloseTo((4 / 3) * 100 * 6 / 9, 4)
    expect(r.I).toBeCloseTo((4 / 3) * 100 * 3 / 9, 4)
    expect(r.S).toBe(0)
    expect(r.C).toBe(0)
  })

  it('equal D and I weight with 3rd S anchor: D = I', () => {
    const r = computeTextualProfile('decidido sociable paciente', lex)!
    // raw: D=3, I=3, S=3 → all equal
    expect(r.D).toBeCloseTo(r.I, 6)
    expect(r.I).toBeCloseTo(r.S, 6)
  })

  it('does not cross-contaminate dimensions', () => {
    const r = computeTextualProfile('sociable paciente meticuloso', lex)!
    expect(r.D).toBe(0)
    expect(r.I + r.S + r.C).toBeCloseTo(FULL, 6)
  })

  it('repeated term still counts once per dimension', () => {
    const once  = computeTextualProfile('decidido sociable paciente', lex)!
    const twice = computeTextualProfile('decidido decidido sociable paciente', lex)!
    expect(twice.D).toBeCloseTo(once.D, 8)
  })
})

// ---------------------------------------------------------------------------
// Morphological matching (tested with ≥ 3 total matches so PT is defined)
// Each test uses a base text with extra matches to clear the threshold,
// then checks the dimension that exercises the morphological rule.
// ---------------------------------------------------------------------------
describe('computeTextualProfile — morphological normalization', () => {
  // Helper: anchor text that adds 2 extra distinct matches (I + S) without D
  const anchor = 'sociable paciente'

  it('feminine singular: decidida → decidido', () => {
    const r = computeTextualProfile(`decidida ${anchor}`, lex)!
    expect(r.D).toBeGreaterThan(0)
    // same weight as masculine form
    const ref = computeTextualProfile(`decidido ${anchor}`, lex)!
    expect(r.D).toBeCloseTo(ref.D, 6)
  })

  it('feminine plural: decididas → decidido', () => {
    const r = computeTextualProfile(`decididas ${anchor}`, lex)!
    const ref = computeTextualProfile(`decidido ${anchor}`, lex)!
    expect(r.D).toBeCloseTo(ref.D, 6)
  })

  it('masculine plural: decididos → decidido', () => {
    const r = computeTextualProfile(`decididos ${anchor}`, lex)!
    const ref = computeTextualProfile(`decidido ${anchor}`, lex)!
    expect(r.D).toBeCloseTo(ref.D, 6)
  })

  it('-s plural: pacientes → paciente', () => {
    const r = computeTextualProfile(`decidido sociable pacientes`, lex)!
    const ref = computeTextualProfile(`decidido sociable paciente`, lex)!
    expect(r.S).toBeCloseTo(ref.S, 6)
  })

  it('strips accents before matching: décidido → decidido', () => {
    const r = computeTextualProfile(`décidido ${anchor}`, lex)!
    const ref = computeTextualProfile(`decidido ${anchor}`, lex)!
    expect(r.D).toBeCloseTo(ref.D, 6)
  })
})
