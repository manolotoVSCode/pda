import type { DimensionVector } from './types'
import { euclidean } from './mask'

const MAX_DISTANCE = 200

export function computeFitScore(
  pc: DimensionVector,
  ideal: DimensionVector
): number {
  return 100 - (euclidean(pc, ideal) / MAX_DISTANCE) * 100
}
