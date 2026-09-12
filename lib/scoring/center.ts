import type { DimensionVector } from './types'

type Dimension = 'D' | 'I' | 'S' | 'C'

/**
 * The expected mean per-dimension score given the fixed 8-of-24 word budget:
 * 8 selections / 6 words-per-dim × 100 = 133.33 total; 133.33 / 4 dims = 100/3 ≈ 33.33.
 * Using 50 (the scale midpoint) as the neutral reference is mathematically wrong —
 * it makes three of four dimensions appear as "deficit" in the average profile.
 */
export const NEUTRAL_POINT = 100 / 3

export function computeDistanceToCenter(
  pc: DimensionVector,
): Record<Dimension, number> {
  return {
    D: Math.abs(pc.D - NEUTRAL_POINT),
    I: Math.abs(pc.I - NEUTRAL_POINT),
    S: Math.abs(pc.S - NEUTRAL_POINT),
    C: Math.abs(pc.C - NEUTRAL_POINT),
  }
}
