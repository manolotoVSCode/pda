import type { DimensionVector } from './types'

type Dimension = 'D' | 'I' | 'S' | 'C'

export function computeDistanceToCenter(
  pc: DimensionVector,
): Record<Dimension, number> {
  return {
    D: Math.abs(pc.D - 50),
    I: Math.abs(pc.I - 50),
    S: Math.abs(pc.S - 50),
    C: Math.abs(pc.C - 50),
  }
}
