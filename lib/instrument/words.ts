import type { Dimension } from '@/lib/scoring/types'

export interface InstrumentWord {
  key: string
  text: string
  dim: Dimension
  isControl: boolean
  pairKey?: string
}

export const MAIN_WORDS: InstrumentWord[] = [
  { key: 'D1', text: 'Decidido',     dim: 'D', isControl: false },
  { key: 'D2', text: 'Directo',      dim: 'D', isControl: false },
  { key: 'D3', text: 'Competitivo',  dim: 'D', isControl: false },
  { key: 'D4', text: 'Exigente',     dim: 'D', isControl: false },
  { key: 'D5', text: 'Firme',        dim: 'D', isControl: false },
  { key: 'D6', text: 'Audaz',        dim: 'D', isControl: false },
  { key: 'I1', text: 'Sociable',     dim: 'I', isControl: false },
  { key: 'I2', text: 'Entusiasta',   dim: 'I', isControl: false },
  { key: 'I3', text: 'Persuasivo',   dim: 'I', isControl: false },
  { key: 'I4', text: 'Expresivo',    dim: 'I', isControl: false },
  { key: 'I5', text: 'Optimista',    dim: 'I', isControl: false },
  { key: 'I6', text: 'Comunicativo', dim: 'I', isControl: false },
  { key: 'S1', text: 'Paciente',     dim: 'S', isControl: false },
  { key: 'S2', text: 'Constante',    dim: 'S', isControl: false },
  { key: 'S3', text: 'Colaborador',  dim: 'S', isControl: false },
  { key: 'S4', text: 'Leal',         dim: 'S', isControl: false },
  { key: 'S5', text: 'Sereno',       dim: 'S', isControl: false },
  { key: 'S6', text: 'Conciliador',  dim: 'S', isControl: false },
  { key: 'C1', text: 'Meticuloso',   dim: 'C', isControl: false },
  { key: 'C2', text: 'Analítico',    dim: 'C', isControl: false },
  { key: 'C3', text: 'Cauteloso',    dim: 'C', isControl: false },
  { key: 'C4', text: 'Ordenado',     dim: 'C', isControl: false },
  { key: 'C5', text: 'Riguroso',     dim: 'C', isControl: false },
  { key: 'C6', text: 'Reservado',    dim: 'C', isControl: false },
]

export const CONTROL_WORDS: InstrumentWord[] = [
  { key: 'ctrl_D', text: 'Resuelto',   dim: 'D', isControl: true, pairKey: 'D1' },
  { key: 'ctrl_I', text: 'Amigable',   dim: 'I', isControl: true, pairKey: 'I1' },
  { key: 'ctrl_S', text: 'Sosegado',   dim: 'S', isControl: true, pairKey: 'S1' },
  { key: 'ctrl_C', text: 'Detallista', dim: 'C', isControl: true, pairKey: 'C1' },
]

export const MAIN_KEYS = new Set(MAIN_WORDS.map(w => w.key))
export const ALL_KEYS = new Set([...MAIN_WORDS, ...CONTROL_WORDS].map(w => w.key))

export const WORD_MAP = new Map<string, InstrumentWord>(
  [...MAIN_WORDS, ...CONTROL_WORDS].map(w => [w.key, w])
)

export const CONTROL_PAIRS: Array<{ controlKey: string; mainKey: string }> = CONTROL_WORDS
  .filter(w => w.pairKey != null)
  .map(w => ({ controlKey: w.key, mainKey: w.pairKey! }))

export const BLOCK2_DISPLAY: InstrumentWord[] = [
  MAIN_WORDS[0],  // D1 Decidido
  MAIN_WORDS[6],  // I1 Sociable
  MAIN_WORDS[12], // S1 Paciente
  MAIN_WORDS[18], // C1 Meticuloso
  MAIN_WORDS[1],  // D2 Directo
  MAIN_WORDS[19], // C2 Analítico
  MAIN_WORDS[13], // S2 Constante
  MAIN_WORDS[7],  // I2 Entusiasta
  MAIN_WORDS[14], // S3 Colaborador
  MAIN_WORDS[2],  // D3 Competitivo
  MAIN_WORDS[20], // C3 Cauteloso
  MAIN_WORDS[8],  // I3 Persuasivo
  MAIN_WORDS[15], // S4 Leal
  MAIN_WORDS[3],  // D4 Exigente
  MAIN_WORDS[21], // C4 Ordenado
  MAIN_WORDS[9],  // I4 Expresivo
  MAIN_WORDS[16], // S5 Sereno
  MAIN_WORDS[4],  // D5 Firme
  MAIN_WORDS[10], // I5 Optimista
  MAIN_WORDS[22], // C5 Riguroso
  MAIN_WORDS[11], // I6 Comunicativo
  MAIN_WORDS[23], // C6 Reservado
  MAIN_WORDS[17], // S6 Conciliador
  MAIN_WORDS[5],  // D6 Audaz
]
