import type { DimensionVector } from './types'

const DIMS = ['D', 'I', 'S', 'C'] as const

// When PT is defined:   PC = PI×0.60 + PP×0.25 + PT×0.15
// When PT is undefined: PC = PI×(12/17) + PP×(5/17)
//   (0.60 and 0.25 redistributed proportionally: 0.60/0.85=12/17, 0.25/0.85=5/17)
export function computeComposite(
  pi: DimensionVector,
  pp: DimensionVector,
  pt: DimensionVector | null
): DimensionVector {
  if (pt === null) {
    return Object.fromEntries(
      DIMS.map(d => [d, pi[d] * (12 / 17) + pp[d] * (5 / 17)])
    ) as DimensionVector
  }
  return Object.fromEntries(
    DIMS.map(d => [d, pi[d] * 0.60 + pp[d] * 0.25 + pt[d] * 0.15])
  ) as DimensionVector
}
