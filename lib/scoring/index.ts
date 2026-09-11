import type { ScoringInput, ScoringResult } from './types'
import { computeProfileVector } from './normalize'
import { computeTextualProfile } from './textual'
import { computeComposite } from './composite'
import { computeMaskIndex } from './mask'
import { computeConsistency } from './consistency'

export function computeAllScores(input: ScoringInput): ScoringResult {
  const pp = computeProfileVector(input.block1Responses)
  const mainBlock2 = input.block2Responses.filter(w => !w.isControl)
  const pi = computeProfileVector(mainBlock2)
  const pt = computeTextualProfile(input.block3Text, input.lexicon)
  const pc = computeComposite(pi, pp, pt)
  const maskIndex = computeMaskIndex(pp, pi)
  const { contradictions, consistencyIndex, level: consistencyLevel } =
    computeConsistency(input.block2Responses, input.durationSeconds)
  return { pp, pi, pt, pc, maskIndex, consistencyIndex, consistencyLevel, contradictions }
}

export type { ScoringInput, ScoringResult, DimensionVector } from './types'
export { computeProfileVector } from './normalize'
export { computeTextualProfile } from './textual'
export { computeComposite } from './composite'
export { computeMaskIndex, euclidean } from './mask'
export { computeConsistency } from './consistency'
export { computeFitScore } from './fit'
export { computeProjection } from './projection'
