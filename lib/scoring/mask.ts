import type { DimensionVector } from './types'

// Real maximum euclidean distance achievable under 8-word budget constraint
// (verified by enumeration: max occurs at 6D+2I vs 6S+2C → √22222.22 ≈ 149.0712)
const MAX_DISTANCE = 149.0712

export function euclidean(a: DimensionVector, b: DimensionVector): number {
  return Math.sqrt(
    (a.D - b.D) ** 2 +
    (a.I - b.I) ** 2 +
    (a.S - b.S) ** 2 +
    (a.C - b.C) ** 2
  )
}

export function computeMaskIndex(
  pp: DimensionVector,
  pi: DimensionVector
): number {
  return (euclidean(pp, pi) / MAX_DISTANCE) * 100
}
