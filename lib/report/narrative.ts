import type { DimensionVector } from '../scoring/types'
import { computeDistanceToCenter } from '../scoring/center'

type Dimension = 'D' | 'I' | 'S' | 'C'

export type NarrativeRow = {
  id: string
  section: string
  dimension: string | null
  subtype: string | null
  questionIndex: number | null
  riskLevel: string | null
  intensity: string | null
  content: string
}

export type TraitEntry = {
  dim: Dimension
  distance: number
  direction: 'excess' | 'deficit'
  label: string
  text: string
}

export type ReportSections = {
  consistencyWarning: string | null
  executiveSummary: string
  communication: string
  motivators: string
  pressure: string
  alerts: string
  maskNote: string | null
  dominantTraits: TraitEntry[]
  interviewQuestions: string[]
  potential: string
}

export const DIM_LABELS: Record<Dimension, string> = {
  D: 'Iniciativa',
  I: 'Vínculo',
  S: 'Cadencia',
  C: 'Precisión',
}

export const DIMS: Dimension[] = ['D', 'I', 'S', 'C']
const TIE_ORDER = DIMS

// Minimum distance from center required to emit a directional paragraph
const NEUTRAL_THRESHOLD = 5
const NEUTRAL_TEXT = 'Esta dimensión se ubica cerca del punto neutro de la escala, sin una tendencia marcada en ninguna dirección.'

function dominantDim(pc: DimensionVector): Dimension {
  return TIE_ORDER.reduce((best, dim) => (pc[dim] > pc[best] ? dim : best))
}

function lowestDim(pc: DimensionVector): Dimension {
  return TIE_ORDER.reduce((low, dim) => (pc[dim] < pc[low] ? dim : low))
}

function intensityLevel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 67) return 'HIGH'
  if (score >= 34) return 'MEDIUM'
  return 'LOW'
}

function findRow(
  rows: NarrativeRow[],
  section: string,
  criteria: Record<string, unknown>,
): NarrativeRow | undefined {
  return rows.find(r => {
    if (r.section !== section) return false
    for (const [k, v] of Object.entries(criteria)) {
      if ((r as Record<string, unknown>)[k] !== v) return false
    }
    return true
  })
}

// §5.2: intensity prefix ends with ": "; first char of paragraph lowercased at render
function withPrefix(prefix: string, content: string): string {
  if (!prefix || !content) return prefix + content
  return prefix + content.charAt(0).toLowerCase() + content.slice(1)
}

// Replaces [gap] marker with unsigned distance value (direction is in the text template)
function buildTraitText(
  rows: NarrativeRow[],
  dim: Dimension,
  distance: number,
  direction: 'excess' | 'deficit',
): string {
  const row = findRow(rows, 'GAP_ANALYSIS', { dimension: dim, subtype: direction })
  if (!row) return ''
  return row.content.replace('[gap]', String(Math.round(distance)))
}

export function buildReportSections(
  rows: NarrativeRow[],
  pc: DimensionVector,
  maskIndex: number,
  consistencyLevel: 'HIGH' | 'MODERATE' | 'LOW',
  candidateName: string,
): ReportSections {
  const consistencyWarning =
    consistencyLevel === 'LOW'
      ? 'ADVERTENCIA: El índice de consistencia de esta evaluación es bajo, lo que reduce la fiabilidad de los resultados. Se recomienda repetir la evaluación antes de tomar una decisión basada en este informe.'
      : null

  const dom = dominantDim(pc)
  const low = lowestDim(pc)
  const level = intensityLevel(pc[dom])

  const intensityRow = findRow(rows, 'INTENSITY', { intensity: level })
  const prefix = intensityRow?.content ?? ''

  const commRow = findRow(rows, 'COMMUNICATION', { dimension: dom })
  const commContent = commRow?.content ?? ''
  const communication = withPrefix(prefix, commContent)

  // Executive summary: first sentence of communication paragraph (no fit/risk metrics)
  const executiveSummary = commContent.split('.')[0] + '.'

  const motivRow = findRow(rows, 'MOTIVATORS', { dimension: dom })
  const motivators = withPrefix(prefix, motivRow?.content ?? '')

  const pressRow = findRow(rows, 'PRESSURE', { dimension: dom })
  const pressure = withPrefix(prefix, pressRow?.content ?? '')

  const alertRow = findRow(rows, 'ALERTS', { dimension: low })
  const maskNote =
    maskIndex > 40
      ? `El Índice de Máscara Social es ${Math.round(maskIndex)}%, indicando un esfuerzo de adaptación social elevado que conviene explorar en una conversación de seguimiento.`
      : null
  const alerts = (alertRow?.content ?? '') + (maskNote ? ' ' + maskNote : '')

  // Dominant traits: sorted by distance to center, descending; explicit tiebreaker by DISC priority
  const distances = computeDistanceToCenter(pc)
  const dominantTraits: TraitEntry[] = DIMS
    .map(dim => {
      const distance = distances[dim]
      const direction: 'excess' | 'deficit' = pc[dim] >= 50 ? 'excess' : 'deficit'
      const text = distance >= NEUTRAL_THRESHOLD
        ? buildTraitText(rows, dim, distance, direction)
        : NEUTRAL_TEXT
      return { dim, distance, direction, label: DIM_LABELS[dim], text }
    })
    .sort((a, b) => {
      const d = b.distance - a.distance
      if (d !== 0) return d
      return TIE_ORDER.indexOf(a.dim) - TIE_ORDER.indexOf(b.dim)
    })

  // Potential: looked up by dominant dimension, [nombre] replaced with candidateName
  const potentialRow = findRow(rows, 'POTENTIAL', { dimension: dom })
  const potential = (potentialRow?.content ?? '').replace('[nombre]', candidateName)

  return {
    consistencyWarning,
    executiveSummary,
    communication,
    motivators,
    pressure,
    alerts,
    maskNote,
    dominantTraits,
    interviewQuestions: [], // populated by caller via selectInterviewQuestions
    potential,
  }
}
