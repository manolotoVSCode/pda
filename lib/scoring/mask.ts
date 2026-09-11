import type { DimensionVector } from './types'

const MAX_DISTANCE = 200

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
