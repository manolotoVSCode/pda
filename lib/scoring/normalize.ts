import type { Dimension, DimensionVector, WordSelectionInput } from './types'

const DIMS: Dimension[] = ['D', 'I', 'S', 'C']

export function computeProfileVector(words: WordSelectionInput[]): DimensionVector {
  return Object.fromEntries(
    DIMS.map(d => [
      d,
      (words.filter(w => !w.isControl && w.dimension === d).length / 6) * 100,
    ])
  ) as DimensionVector
}
