import type { BlockResponseInput } from './types'

export interface ConsistencyResult {
  contradictions: number
  rawConsistency: number
  consistencyIndex: number
  level: 'HIGH' | 'MODERATE' | 'LOW'
}

export function computeConsistency(
  block2Responses: BlockResponseInput[],
  durationSeconds: number
): ConsistencyResult {
  const group1 = block2Responses.find(r => r.groupNumber === 1 && !r.isControl)
  const group7 = block2Responses.find(r => r.groupNumber === 7 && r.isControl)

  if (!group1 || !group7) {
    throw new Error('computeConsistency: faltan respuestas del grupo 1 o del grupo 7 en Bloque 2')
  }

  let contradictions = 0

  if (group1.leastDim === group7.mostDim) contradictions++
  if (group1.mostDim === group7.leastDim) contradictions++

  const rawConsistency = 100 - (contradictions / 2) * 100
  const durationMinutes = durationSeconds / 60
  const consistencyIndex = durationMinutes < 3
    ? Math.min(rawConsistency, 60)
    : rawConsistency

  const level: 'HIGH' | 'MODERATE' | 'LOW' =
    consistencyIndex >= 85 ? 'HIGH' :
    consistencyIndex >= 60 ? 'MODERATE' : 'LOW'

  return { contradictions, rawConsistency, consistencyIndex, level }
}
