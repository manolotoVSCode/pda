import type { DimensionVector } from './types'

const DIMS = ['D', 'I', 'S', 'C'] as const

export function computeComposite(
  pi: DimensionVector,
  pp: DimensionVector,
  pt: DimensionVector
): DimensionVector {
  return Object.fromEntries(
    DIMS.map(d => [d, pi[d] * 0.60 + pp[d] * 0.25 + pt[d] * 0.15])
  ) as DimensionVector
}
