import type { DimensionVector } from '../scoring/types'
import { computeDistanceToCenter, NEUTRAL_POINT } from '../scoring/center'

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

export type ProfileParagraph = {
  dim: Dimension
  text: string
}

export type ReportSections = {
  consistencyWarning: string | null
  executiveSummary: string
  profileDescription: ProfileParagraph[]
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

// §3.7 threshold: distance < 10/3 → emit neutral phrase instead of directional paragraph.
// Proportionally scaled from the old 5-point threshold (calibrated at neutral=50):
// 5 × (100/3) / 50 = 10/3 ≈ 3.33 points.
const NEUTRAL_THRESHOLD = 10 / 3

// §5.1 / Análisis de rasgos dominantes: neutral text for near-center dimensions
const NEUTRAL_TRAIT_TEXT = 'Esta dimensión se ubica cerca del punto neutro de la escala, sin una tendencia marcada en ninguna dirección.'

// §5.2: neutral text for Descripción del Perfil (uses dimension name)
function neutralProfileText(dim: Dimension): string {
  return `Su nivel de ${DIM_LABELS[dim]} se ubica cerca del punto medio de la escala, sin una tendencia marcada en ninguna dirección.`
}

function dominantDim(pc: DimensionVector): Dimension {
  return TIE_ORDER.reduce((best, dim) => (pc[dim] > pc[best] ? dim : best))
}

function lowestDim(pc: DimensionVector): Dimension {
  return TIE_ORDER.reduce((low, dim) => (pc[dim] < pc[low] ? dim : low))
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

// Replaces [gap] marker with unsigned distance value
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

  const distances = computeDistanceToCenter(pc)

  // §5.1: sort dimensions by distance to center, descending; DISC order as tiebreaker
  const sortedDims = DIMS
    .map(dim => ({ dim, distance: distances[dim] }))
    .sort((a, b) => {
      const d = b.distance - a.distance
      if (d !== 0) return d
      return TIE_ORDER.indexOf(a.dim) - TIE_ORDER.indexOf(b.dim)
    })

  // §5.1 / §5.3: build one paragraph per dimension in sorted order
  const profileDescription: ProfileParagraph[] = sortedDims.map(({ dim, distance }) => {
    if (distance < NEUTRAL_THRESHOLD) return { dim, text: neutralProfileText(dim) }
    const subtype = pc[dim] >= NEUTRAL_POINT ? 'high' : 'low'
    const row = findRow(rows, 'PROFILE_DESCRIPTION', { dimension: dim, subtype })
    return { dim, text: row?.content ?? neutralProfileText(dim) }
  })

  // §4 / §5.1: executive summary = first sentence of the top-distance dimension's paragraph
  const executiveSummary = ((profileDescription[0]?.text ?? '').split('.')[0] ?? '') + '.'

  // Alerts
  const low = lowestDim(pc)
  const alertRow = findRow(rows, 'ALERTS', { dimension: low })
  const maskNote =
    maskIndex > 40
      ? `El Índice de Máscara Social es ${Math.round(maskIndex)}%, indicando un esfuerzo de adaptación social elevado que conviene explorar en una conversación de seguimiento.`
      : null
  const alerts = (alertRow?.content ?? '') + (maskNote ? ' ' + maskNote : '')

  // Dominant traits: sorted by distance to center, descending
  const dominantTraits: TraitEntry[] = sortedDims.map(({ dim, distance }) => {
    const direction: 'excess' | 'deficit' = pc[dim] >= NEUTRAL_POINT ? 'excess' : 'deficit'
    const text = distance >= NEUTRAL_THRESHOLD
      ? buildTraitText(rows, dim, distance, direction)
      : NEUTRAL_TRAIT_TEXT
    return { dim, distance, direction, label: DIM_LABELS[dim], text }
  })

  // Potential: looked up by dominant dimension, [nombre] replaced with candidateName
  const dom = dominantDim(pc)
  const potentialRow = findRow(rows, 'POTENTIAL', { dimension: dom })
  const potential = (potentialRow?.content ?? '').replace('[nombre]', candidateName)

  return {
    consistencyWarning,
    executiveSummary,
    profileDescription,
    alerts,
    maskNote,
    dominantTraits,
    interviewQuestions: [], // populated by caller via selectInterviewQuestions
    potential,
  }
}
