import type { Dimension, DimensionVector, LexiconEntry } from './types'

const DIMS: Dimension[] = ['D', 'I', 'S', 'C']

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeText(text: string): string {
  return removeAccents(text.toLowerCase()).replace(/[^a-z\s]/g, '')
}

function resolveCanonical(token: string, terms: Set<string>): string | null {
  if (terms.has(token)) return token
  if (token.length > 2 && token.endsWith('as')) {
    const t = token.slice(0, -2) + 'o'
    if (terms.has(t)) return t
  }
  if (token.length > 2 && token.endsWith('os')) {
    const t = token.slice(0, -2) + 'o'
    if (terms.has(t)) return t
  }
  if (token.length > 1 && token.endsWith('a')) {
    const t = token.slice(0, -1) + 'o'
    if (terms.has(t)) return t
  }
  if (token.length > 2 && token.endsWith('es')) {
    const t = token.slice(0, -2)
    if (terms.has(t)) return t
  }
  if (token.length > 1 && token.endsWith('s')) {
    const t = token.slice(0, -1)
    if (terms.has(t)) return t
  }
  return null
}

export function computeTextualProfile(
  text: string,
  lexicon: LexiconEntry[]
): DimensionVector {
  const tokens = normalizeText(text).split(/\s+/).filter(Boolean)

  const weightByDim: Record<Dimension, Map<string, number>> = {
    D: new Map(), I: new Map(), S: new Map(), C: new Map(),
  }
  for (const entry of lexicon) {
    weightByDim[entry.dimension].set(entry.term, entry.weight)
  }

  const termSetByDim: Record<Dimension, Set<string>> = {
    D: new Set(weightByDim.D.keys()),
    I: new Set(weightByDim.I.keys()),
    S: new Set(weightByDim.S.keys()),
    C: new Set(weightByDim.C.keys()),
  }

  const denominator: Record<Dimension, number> = {
    D: 0, I: 0, S: 0, C: 0,
  }
  for (const entry of lexicon) {
    denominator[entry.dimension] += entry.weight
  }

  const matched: Record<Dimension, Set<string>> = {
    D: new Set(), I: new Set(), S: new Set(), C: new Set(),
  }
  const rawScore: Record<Dimension, number> = { D: 0, I: 0, S: 0, C: 0 }

  for (const token of tokens) {
    for (const dim of DIMS) {
      const canon = resolveCanonical(token, termSetByDim[dim])
      if (canon !== null && !matched[dim].has(canon)) {
        matched[dim].add(canon)
        rawScore[dim] += weightByDim[dim].get(canon)!
      }
    }
  }

  return Object.fromEntries(
    DIMS.map(d => [
      d,
      denominator[d] === 0 ? 0 : (rawScore[d] / denominator[d]) * 100,
    ])
  ) as DimensionVector
}
