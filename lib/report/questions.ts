import type { DimensionVector } from '../scoring/types'
import type { NarrativeRow } from './narrative'

type Dimension = 'D' | 'I' | 'S' | 'C'

const TIE_ORDER: Dimension[] = ['D', 'I', 'S', 'C']

export function selectInterviewQuestions(
  rows: NarrativeRow[],
  pc: DimensionVector,
  ideal: DimensionVector,
): string[] {
  const gaps = TIE_ORDER.map(dim => ({
    dim,
    gap: pc[dim] - ideal[dim],
    absGap: Math.abs(pc[dim] - ideal[dim]),
  }))

  // Use epsilon to guard against floating-point noise in absGap; any difference
  // smaller than 0.01 pts on a 0-100 scale is meaningless and resolved by TIE_ORDER.
  gaps.sort((a, b) => {
    const diff = b.absGap - a.absGap
    if (Math.abs(diff) > 0.01) return diff
    return TIE_ORDER.indexOf(a.dim) - TIE_ORDER.indexOf(b.dim)
  })

  // Skip dims with gap === 0 (no clear direction)
  const ranked = gaps.filter(g => g.gap !== 0)

  const selected: typeof gaps = []
  for (const g of ranked) {
    if (selected.length < 2) {
      selected.push(g)
    } else if (selected.length === 2) {
      // Include 3rd dim if within 5 pts of 2nd
      if (g.absGap >= selected[1].absGap - 5) {
        selected.push(g)
      }
      break
    }
  }

  const questions: string[] = []
  for (const { dim, gap } of selected) {
    const subtype = gap > 0 ? 'excess' : 'deficit'
    for (const qi of [1, 2] as const) {
      const row = rows.find(
        r =>
          r.section === 'INTERVIEW_QUESTIONS' &&
          r.dimension === dim &&
          r.subtype === subtype &&
          r.questionIndex === qi,
      )
      if (row) questions.push(row.content)
    }
  }

  return questions
}
