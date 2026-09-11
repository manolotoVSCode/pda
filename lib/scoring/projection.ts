import type { DimensionVector } from './types'

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface ProjectionResult {
  projectionScore: number
  riskLevel: RiskLevel
}

export function computeProjection(
  fitScore: number,
  maskIndex: number,
  pc: DimensionVector
): ProjectionResult {
  const stabilityComponent = (pc.S + pc.C) / 2
  const projectionScore =
    fitScore * 0.50 +
    (100 - maskIndex) * 0.20 +
    stabilityComponent * 0.30

  const riskLevel: RiskLevel =
    projectionScore >= 75 ? 'LOW' :
    projectionScore >= 50 ? 'MEDIUM' : 'HIGH'

  return { projectionScore, riskLevel }
}
