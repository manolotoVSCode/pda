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

// Returns null when no lexicon terms were matched (PT undefined).
// When defined: PT[dim] = (4/3) × 100 × rawScore[dim] / sum(rawScores).
// This relative normalization keeps PT on the same aggregate scale as PP and PI
// (both of which also sum to 133.33 for any 8-word selection).
export function computeTextualProfile(
  text: string,
  lexicon: LexiconEntry[]
): DimensionVector | null {
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

  // Minimum activation threshold: fewer than 3 distinct matched terms across all
  // dimensions is insufficient signal — a single matched word can shift one dimension
  // by 10–20 points while leaving the others at zero, producing more noise than
  // information. Below this threshold PT is treated as undefined, same code path as
  // when no terms match at all.
  const totalMatches = DIMS.reduce((s, d) => s + matched[d].size, 0)
  if (totalMatches < 3) return null

  const totalSum = DIMS.reduce((s, d) => s + rawScore[d], 0)

  return Object.fromEntries(
    DIMS.map(d => [d, (4 / 3) * 100 * rawScore[d] / totalSum])
  ) as DimensionVector
}
