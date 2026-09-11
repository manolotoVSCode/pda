import type { ScoringInput, ScoringResult, DimensionVector } from './types'
import { computeProfileVector } from './normalize'
import { computeTextualProfile } from './textual'
import { computeComposite } from './composite'
import { computeMaskIndex } from './mask'
import { computeConsistency, type ConsistencyResult } from './consistency'
import { computeFitScore } from './fit'
import { computeProjection, type ProjectionResult } from './projection'

export interface FullScoringResult extends ScoringResult {
  fitScore: number
  projectionScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

export function computeAllScores(
  input: ScoringInput,
  ideal: DimensionVector
): FullScoringResult {
  const pp = computeProfileVector(input.block1Responses)
  const mainBlock2 = input.block2Responses.filter(r => !r.isControl)
  const pi = computeProfileVector(mainBlock2)
  const pt = computeTextualProfile(input.block3Text, input.lexicon)
  const pc = computeComposite(pi, pp, pt)
  const maskIndex = computeMaskIndex(pp, pi)
  const { contradictions, consistencyIndex, level: consistencyLevel } =
    computeConsistency(input.block2Responses, input.durationSeconds)
  const fitScore = computeFitScore(pc, ideal)
  const { projectionScore, riskLevel } = computeProjection(fitScore, maskIndex, pc)

  return {
    pp, pi, pt, pc,
    maskIndex,
    consistencyIndex,
    consistencyLevel,
    contradictions,
    fitScore,
    projectionScore,
    riskLevel,
  }
}

export type { ScoringInput, ScoringResult, DimensionVector } from './types'
export { computeProfileVector } from './normalize'
export { computeTextualProfile } from './textual'
export { computeComposite } from './composite'
export { computeMaskIndex, euclidean } from './mask'
export { computeConsistency } from './consistency'
export { computeFitScore } from './fit'
export { computeProjection } from './projection'
