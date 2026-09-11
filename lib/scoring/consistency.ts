import type { WordSelectionInput } from './types'
import { CONTROL_PAIRS } from '../instrument/words'

export interface ConsistencyResult {
  contradictions: number
  rawConsistency: number
  consistencyIndex: number
  level: 'HIGH' | 'MODERATE' | 'LOW'
}

export function computeConsistency(
  block2Words: WordSelectionInput[],
): ConsistencyResult {
  const markedKeys = new Set(block2Words.map(w => w.wordKey))
  let contradictions = 0
  for (const { controlKey, mainKey } of CONTROL_PAIRS) {
    if (markedKeys.has(controlKey) !== markedKeys.has(mainKey)) contradictions++
  }
  const rawConsistency = (1 - contradictions / 4) * 100
  const consistencyIndex = rawConsistency
  const level: 'HIGH' | 'MODERATE' | 'LOW' =
    consistencyIndex >= 75 ? 'HIGH' :
    consistencyIndex >= 50 ? 'MODERATE' : 'LOW'
  return { contradictions, rawConsistency, consistencyIndex, level }
}
