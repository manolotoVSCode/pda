export type Dimension = 'D' | 'I' | 'S' | 'C'

export type DimensionVector = {
  D: number
  I: number
  S: number
  C: number
}

export interface WordSelectionInput {
  wordKey: string
  dimension: Dimension
  isControl: boolean
}

export interface LexiconEntry {
  dimension: Dimension
  term: string
  weight: number
}

export interface ScoringInput {
  block1Responses: WordSelectionInput[]
  block2Responses: WordSelectionInput[]
  block3Text: string
  durationSeconds: number
  lexicon: LexiconEntry[]
}

export interface ScoringResult {
  pp: DimensionVector
  pi: DimensionVector
  pt: DimensionVector
  pc: DimensionVector
  maskIndex: number
  consistencyIndex: number
  consistencyLevel: 'HIGH' | 'MODERATE' | 'LOW'
  contradictions: number
}
