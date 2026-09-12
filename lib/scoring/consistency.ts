import type { WordSelectionInput, Dimension } from './types'
import { CONTROL_WORDS } from '../instrument/words'

export interface ConsistencyResult {
  contradictions: number
  rawConsistency: number
  consistencyIndex: number
  level: 'HIGH' | 'MODERATE' | 'LOW'
}

const N = CONTROL_WORDS.length  // 12

/**
 * Computes the consistency index using a combined two-mechanism design:
 *
 * 1. PRIMARY INDEX — dimension-level coincidence:
 *    Each control word is checked against the PRESENCE of its dimension in the
 *    block-2 main selection, not against its specific anchor word.
 *    Contradiction when: control=YES and k_dim=0, or control=NO and k_dim>0.
 *    This eliminates false positives caused by the fixed 8-word budget forcing
 *    genuine respondents to skip specific anchors within dimensions they do endorse.
 *
 * 2. UNIFORM-PATTERN OVERRIDE:
 *    If all 12 control decisions are identical (all YES or all NO), classify
 *    directly as LOW regardless of the primary index. This catches the "yes to
 *    everything" inattentive pattern that the dimension-level index cannot detect
 *    (P(HIGH | always YES, dimension index alone) ≈ 99.8%).
 */
export function computeConsistency(
  block2Words: WordSelectionInput[],
): ConsistencyResult {
  const selectedKeys = new Set(block2Words.map(w => w.wordKey))

  // k_dim: count of main (non-control) words selected per dimension
  const kDim: Record<Dimension, number> = { D: 0, I: 0, S: 0, C: 0 }
  for (const w of block2Words) {
    if (!w.isControl) kDim[w.dimension]++
  }

  // Uniform-pattern override: all 12 controls identical state → forced LOW
  const selectedCtrlCount = CONTROL_WORDS.filter(c => selectedKeys.has(c.key)).length
  const uniformPattern = selectedCtrlCount === 0 || selectedCtrlCount === N

  // Dimension-level contradictions
  let contradictions = 0
  for (const ctrl of CONTROL_WORDS) {
    const selected = selectedKeys.has(ctrl.key)
    const k = kDim[ctrl.dim]
    if (selected && k === 0) contradictions++   // said YES to control but dim not endorsed
    if (!selected && k > 0) contradictions++   // said NO to control but dim is endorsed
  }

  const rawConsistency = (1 - contradictions / N) * 100
  const consistencyIndex = rawConsistency
  const level: 'HIGH' | 'MODERATE' | 'LOW' =
    uniformPattern       ? 'LOW' :
    consistencyIndex >= 75 ? 'HIGH' :
    consistencyIndex >= 50 ? 'MODERATE' : 'LOW'

  return { contradictions, rawConsistency, consistencyIndex, level }
}
