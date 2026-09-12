import { describe, it, expect } from 'vitest'
import { computeTextualProfile } from '../../lib/scoring/textual'
import type { LexiconEntry } from '../../lib/scoring/types'

// Test lexicon: one term per dimension at weight 3, plus a second D term
const lex: LexiconEntry[] = [
  { dimension: 'D', term: 'decidido', weight: 3 },
  { dimension: 'D', term: 'directo',  weight: 3 },
  { dimension: 'I', term: 'sociable',    weight: 3 },
  { dimension: 'S', term: 'paciente',    weight: 3 },
  { dimension: 'C', term: 'meticuloso',  weight: 3 },
]

// Relative normalization: PT[dim] = (4/3) × 100 × rawScore[dim] / totalSum
// When only one dimension matches: PT[that_dim] = (4/3) × 100 = 133.33
const SOLO = (4 / 3) * 100          // 133.33... — score when only one dim has any match
const HALF = (4 / 3) * 100 * 0.5   //  66.67... — score for each dim when two dims tie

describe('computeTextualProfile', () => {
  it('no matches → null (PT undefined)', () => {
    expect(computeTextualProfile('nada relevante aqui', lex)).toBeNull()
  })
  it('empty text → null', () => {
    expect(computeTextualProfile('', lex)).toBeNull()
  })
  it('empty lexicon → null', () => {
    expect(computeTextualProfile('decidido sociable paciente meticuloso', [])).toBeNull()
  })

  it('single D match → D ≈ 133.33, others = 0', () => {
    const r = computeTextualProfile('soy decidido', lex)!
    expect(r).not.toBeNull()
    expect(r.D).toBeCloseTo(SOLO, 6)
    expect(r.I).toBe(0)
    expect(r.S).toBe(0)
    expect(r.C).toBe(0)
  })
  it('feminine form: decidida matches decidido', () => {
    const r = computeTextualProfile('soy decidida', lex)!
    expect(r.D).toBeCloseTo(SOLO, 6)
  })
  it('feminine plural: decididas matches decidido', () => {
    const r = computeTextualProfile('somos decididas', lex)!
    expect(r.D).toBeCloseTo(SOLO, 6)
  })
  it('masculine plural: decididos matches decidido', () => {
    const r = computeTextualProfile('somos decididos', lex)!
    expect(r.D).toBeCloseTo(SOLO, 6)
  })
  it('-s plural: pacientes matches paciente → S ≈ 133.33', () => {
    const r = computeTextualProfile('soy paciente', lex)!
    expect(r.S).toBeCloseTo(SOLO, 6)
  })

  it('repeated term counts only once — same score as single mention', () => {
    const once = computeTextualProfile('decidido', lex)!
    const three = computeTextualProfile('decidido decidido decidido', lex)!
    expect(three.D).toBeCloseTo(once.D, 8)
  })
  it('both D terms matched → still D ≈ 133.33 (only dim in sum)', () => {
    const r = computeTextualProfile('decidido directo', lex)!
    expect(r.D).toBeCloseTo(SOLO, 6)
    expect(r.I).toBe(0)
  })
  it('D and I each matched → each ≈ 66.67', () => {
    const r = computeTextualProfile('decidido sociable', lex)!
    expect(r.D).toBeCloseTo(HALF, 6)
    expect(r.I).toBeCloseTo(HALF, 6)
    expect(r.S).toBe(0)
    expect(r.C).toBe(0)
  })
  it('does not cross-contaminate dimensions', () => {
    const r = computeTextualProfile('sociable', lex)!
    expect(r.D).toBe(0)
    expect(r.I).toBeCloseTo(SOLO, 6)
  })
  it('strips accents in text before matching', () => {
    const r = computeTextualProfile('décidido', lex)!
    expect(r.D).toBeCloseTo(SOLO, 6)
  })
  it('sum of all PT dimensions = 133.33 whenever any match exists', () => {
    const texts = ['decidido', 'decidido sociable', 'decidido sociable paciente meticuloso']
    for (const t of texts) {
      const r = computeTextualProfile(t, lex)!
      const sum = r.D + r.I + r.S + r.C
      expect(sum).toBeCloseTo((4 / 3) * 100, 6)
    }
  })
  it('single-term lexicon: match → D ≈ 133.33', () => {
    const lex1: LexiconEntry[] = [{ dimension: 'D', term: 'decidido', weight: 2 }]
    const r = computeTextualProfile('decidido', lex1)!
    expect(r.D).toBeCloseTo(SOLO, 6)
  })
})
