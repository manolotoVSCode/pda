import type { DimensionVector } from '../scoring/types'
import type { NarrativeRow } from './narrative'
import { NEUTRAL_POINT } from '../scoring/center'

type Dimension = 'D' | 'I' | 'S' | 'C'

const TIE_ORDER: Dimension[] = ['D', 'I', 'S', 'C']

export function selectInterviewQuestions(
  rows: NarrativeRow[],
  pc: DimensionVector,
): string[] {
  const ranked = TIE_ORDER
    .map(dim => ({
      dim,
      distance: Math.abs(pc[dim] - NEUTRAL_POINT),
      direction: pc[dim] >= NEUTRAL_POINT ? 'excess' : 'deficit',
    }))
    .sort((a, b) => {
      const diff = b.distance - a.distance
      // Epsilon guard against float noise; tie broken by TIE_ORDER
      if (Math.abs(diff) > 0.01) return diff
      return TIE_ORDER.indexOf(a.dim) - TIE_ORDER.indexOf(b.dim)
    })

  // Select top 2; add 3rd if within 10/3 pts of 2nd (max 6 questions total).
  // Threshold scaled proportionally from the old 5-point value (neutral=50 → neutral=100/3).
  const selected = ranked.slice(0, 2)
  if (ranked.length > 2 && ranked[2].distance >= ranked[1].distance - 10 / 3) {
    selected.push(ranked[2])
  }

  const questions: string[] = []
  for (const { dim, direction } of selected) {
    for (const qi of [1, 2] as const) {
      const row = rows.find(
        r =>
          r.section === 'INTERVIEW_QUESTIONS' &&
          r.dimension === dim &&
          r.subtype === direction &&
          r.questionIndex === qi,
      )
      if (row) questions.push(row.content)
    }
  }

  return questions
}
