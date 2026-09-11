import type { Dimension, DimensionVector, BlockResponseInput } from './types'

const DIMS: Dimension[] = ['D', 'I', 'S', 'C']

export function rawScore(
  responses: BlockResponseInput[],
  dim: Dimension
): number {
  return responses.reduce((acc, r) => {
    if (r.mostDim === dim) return acc + 1
    if (r.leastDim === dim) return acc - 1
    return acc
  }, 0)
}

export function normalizeScore(raw: number): number {
  return (raw + 6) / 12 * 100
}

export function computeProfileVector(
  responses: BlockResponseInput[]
): DimensionVector {
  return Object.fromEntries(
    DIMS.map(d => [d, normalizeScore(rawScore(responses, d))])
  ) as DimensionVector
}
