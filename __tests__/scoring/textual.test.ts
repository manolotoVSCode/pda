import { describe, it, expect } from 'vitest'
import { computeTextualProfile } from '../../lib/scoring/textual'
import type { LexiconEntry } from '../../lib/scoring/types'

const lex: LexiconEntry[] = [
  { dimension: 'D', term: 'decidido', weight: 3 },
  { dimension: 'D', term: 'directo', weight: 3 },
  { dimension: 'I', term: 'sociable', weight: 3 },
  { dimension: 'S', term: 'paciente', weight: 3 },
  { dimension: 'C', term: 'meticuloso', weight: 3 },
]

describe('computeTextualProfile', () => {
  it('exact match: decidido → D score = 50', () => {
    const r = computeTextualProfile('soy decidido', lex)
    expect(r.D).toBeCloseTo(50, 10)
  })
  it('feminine: decidida matches decidido', () => {
    const r = computeTextualProfile('soy decidida', lex)
    expect(r.D).toBeCloseTo(50, 10)
  })
  it('feminine plural: decididas matches decidido', () => {
    const r = computeTextualProfile('somos decididas', lex)
    expect(r.D).toBeCloseTo(50, 10)
  })
  it('masculine plural: decididos matches decidido', () => {
    const r = computeTextualProfile('somos decididos', lex)
    expect(r.D).toBeCloseTo(50, 10)
  })
  it('-s plural: pacientes matches paciente', () => {
    const r = computeTextualProfile('soy pacientes', lex)
    expect(r.S).toBeCloseTo(100, 10)
  })
  it('repeated term counts only once', () => {
    const r = computeTextualProfile('decidido decidido decidido', lex)
    expect(r.D).toBeCloseTo(50, 10)
  })
  it('all terms present in dimension → 100', () => {
    const r = computeTextualProfile('decidido directo', lex)
    expect(r.D).toBe(100)
  })
  it('empty text → 0 for all dimensions', () => {
    const r = computeTextualProfile('', lex)
    expect(r.D).toBe(0)
    expect(r.I).toBe(0)
    expect(r.S).toBe(0)
    expect(r.C).toBe(0)
  })
  it('empty lexicon → 0 for all dimensions', () => {
    const r = computeTextualProfile('decidido sociable paciente meticuloso', [])
    expect(r.D).toBe(0)
  })
  it('strips accents in text before matching', () => {
    const r = computeTextualProfile('décidido', lex)
    expect(r.D).toBeCloseTo(50, 10)
  })
  it('single-term lexicon → 100 on match', () => {
    const lex1: LexiconEntry[] = [{ dimension: 'D', term: 'decidido', weight: 2 }]
    const r = computeTextualProfile('decidido', lex1)
    expect(r.D).toBe(100)
  })
  it('does not cross-contaminate dimensions', () => {
    const r = computeTextualProfile('sociable', lex)
    expect(r.D).toBe(0)
    expect(r.I).toBeCloseTo(100, 10)
  })
})
