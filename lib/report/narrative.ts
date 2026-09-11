import type { DimensionVector } from '../scoring/types'

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

export type GapEntry = {
  dim: Dimension
  gap: number
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
  gapAnalysis: GapEntry[]
  interviewQuestions: string[]
  projection: string
}

export const DIM_LABELS: Record<Dimension, string> = {
  D: 'Iniciativa',
  I: 'Vínculo',
  S: 'Cadencia',
  C: 'Precisión',
}

export const DIMS: Dimension[] = ['D', 'I', 'S', 'C']
const TIE_ORDER = DIMS

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

// §5.2: intensity prefix always ends with ": "; first char of the paragraph must be lowercased
// so it reads as a grammatical continuation. The stored content keeps its uppercase initial.
function withPrefix(prefix: string, content: string): string {
  if (!prefix || !content) return prefix + content
  return prefix + content.charAt(0).toLowerCase() + content.slice(1)
}

// Gap marker: [gap] is replaced with the signed rounded value (e.g. "+15 pts" or "−24 pts")
function buildGapText(rows: NarrativeRow[], dim: Dimension, gap: number): string {
  const subtype = gap > 0 ? 'excess' : 'deficit'
  const row = findRow(rows, 'GAP_ANALYSIS', { dimension: dim, subtype })
  if (!row) return ''
  // Template has "[gap] pts" — replace only the marker, not the trailing unit
  const sign = gap > 0 ? '+' : '−'
  const marker = `${sign}${Math.round(Math.abs(gap))}`
  return row.content.replace('[gap]', marker)
}

export function buildReportSections(
  rows: NarrativeRow[],
  pc: DimensionVector,
  ideal: DimensionVector,
  fitScore: number,
  maskIndex: number,
  consistencyLevel: 'HIGH' | 'MODERATE' | 'LOW',
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
  interviewQuestions: string[],
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
  const communication = withPrefix(prefix, commRow?.content ?? '')

  const riskLabel =
    riskLevel === 'LOW' ? 'Bajo' : riskLevel === 'MEDIUM' ? 'Moderado' : 'Alto'
  const commContent = commRow?.content ?? ''
  const commFirstSentence = commContent.split('.')[0]
  const executiveSummary =
    `Ajuste al cargo: ${Math.round(fitScore)}%. Riesgo de adaptación: ${riskLabel}. ` +
    commFirstSentence + '.'

  const motivRow = findRow(rows, 'MOTIVATORS', { dimension: dom })
  const motivators = withPrefix(prefix, motivRow?.content ?? '')

  const pressRow = findRow(rows, 'PRESSURE', { dimension: dom })
  const pressure = withPrefix(prefix, pressRow?.content ?? '')

  const alertRow = findRow(rows, 'ALERTS', { dimension: low })
  const maskNote =
    maskIndex > 40
      ? `El Índice de Máscara Social es ${Math.round(maskIndex)}%, indicando un esfuerzo de adaptación social elevado que conviene explorar en entrevista.`
      : null
  const alerts =
    (alertRow?.content ?? '') + (maskNote ? ' ' + maskNote : '')

  // Gap analysis: text loaded from GAP_ANALYSIS rows in DB
  const gapAnalysis: GapEntry[] = DIMS.map(dim => {
    const gap = pc[dim] - ideal[dim]
    return {
      dim,
      gap,
      label: DIM_LABELS[dim],
      text: buildGapText(rows, dim, gap),
    }
  })

  const projRow = findRow(rows, 'PROJECTION', { riskLevel })
  const largestGapDim = DIMS.reduce((best, dim) =>
    Math.abs(pc[dim] - ideal[dim]) > Math.abs(pc[best] - ideal[best]) ? dim : best,
  )
  const projection = (projRow?.content ?? '')
    .replace('[nombre]', candidateName)
    .replace('[porcentaje]', Math.round(fitScore) + '%')
    .replace('[dimensión de mayor brecha]', DIM_LABELS[largestGapDim])

  return {
    consistencyWarning,
    executiveSummary,
    communication,
    motivators,
    pressure,
    alerts,
    maskNote,
    gapAnalysis,
    interviewQuestions,
    projection,
  }
}
