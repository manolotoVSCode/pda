import { describe, it, expect } from 'vitest'
import { computeProfileVector } from '../../lib/scoring/normalize'
import type { WordSelectionInput } from '../../lib/scoring/types'

function w(key: string, dim: 'D'|'I'|'S'|'C', isControl = false): WordSelectionInput {
  return { wordKey: key, dimension: dim, isControl }
}

describe('computeProfileVector', () => {
  it('6 D words → D=100, others=0', () => {
    const words = ['D1','D2','D3','D4','D5','D6'].map(k => w(k, 'D'))
    const v = computeProfileVector(words)
    expect(v.D).toBe(100)
    expect(v.I).toBe(0)
    expect(v.S).toBe(0)
    expect(v.C).toBe(0)
  })
  it('0 words → all 0', () => {
    const v = computeProfileVector([])
    expect(v.D).toBe(0); expect(v.I).toBe(0); expect(v.S).toBe(0); expect(v.C).toBe(0)
  })
  it('3 D words → D=50', () => {
    const v = computeProfileVector(['D1','D2','D3'].map(k => w(k, 'D')))
    expect(v.D).toBeCloseTo(50)
  })
  it('1 word per dimension → each ~16.67', () => {
    const words = [w('D1','D'), w('I1','I'), w('S1','S'), w('C1','C')]
    const v = computeProfileVector(words)
    expect(v.D).toBeCloseTo(100/6)
    expect(v.I).toBeCloseTo(100/6)
    expect(v.S).toBeCloseTo(100/6)
    expect(v.C).toBeCloseTo(100/6)
  })
  it('control words are excluded from scoring', () => {
    const words = [w('D1','D'), w('ctrl_D','D', true)]
    const v = computeProfileVector(words)
    expect(v.D).toBeCloseTo(100/6)
  })
  it('mixed D+I: 3 each → D=50, I=50, others=0', () => {
    const words = [
      w('D1','D'), w('D2','D'), w('D3','D'),
      w('I1','I'), w('I2','I'), w('I3','I'),
    ]
    const v = computeProfileVector(words)
    expect(v.D).toBeCloseTo(50)
    expect(v.I).toBeCloseTo(50)
    expect(v.S).toBe(0)
    expect(v.C).toBe(0)
  })
})
