import type { DimensionVector } from './types'

const DIMS = ['D', 'I', 'S', 'C'] as const

// When PT is defined:   PC = clamp(PI×0.60 + PP×0.25 + PT×0.15, 0, 100)
// When PT is undefined: PC = clamp(PI×(12/17) + PP×(5/17), 0, 100)
//   (0.60 and 0.25 redistributed proportionally: 0.60/0.85=12/17, 0.25/0.85=5/17)
// Clamping is required because PT can reach 133.33 when text concentrates all
// matched weight in one dimension, which without clamping would push PC above 100.
// PP and PI are bounded by 100 per dimension; PT is not.
export function computeComposite(
  pi: DimensionVector,
  pp: DimensionVector,
  pt: DimensionVector | null
): DimensionVector {
  if (pt === null) {
    return Object.fromEntries(
      DIMS.map(d => [d, Math.min(100, Math.max(0, pi[d] * (12 / 17) + pp[d] * (5 / 17)))])
    ) as DimensionVector
  }
  return Object.fromEntries(
    DIMS.map(d => [d, Math.min(100, Math.max(0, pi[d] * 0.60 + pp[d] * 0.25 + pt[d] * 0.15))])
  ) as DimensionVector
}
