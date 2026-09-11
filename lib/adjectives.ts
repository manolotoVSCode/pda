import type { Dimension } from '@/lib/scoring/types'

export interface Adjective {
  text: string
  dim: Dimension
}

export interface AdjectiveGroup {
  groupNumber: number
  isControl: boolean
  adjectives: Adjective[]
}

export const MAIN_GROUPS: AdjectiveGroup[] = [
  { groupNumber: 1, isControl: false, adjectives: [
    { text: 'Decidido', dim: 'D' }, { text: 'Sociable', dim: 'I' },
    { text: 'Paciente', dim: 'S' }, { text: 'Meticuloso', dim: 'C' },
  ]},
  { groupNumber: 2, isControl: false, adjectives: [
    { text: 'Directo', dim: 'D' }, { text: 'Entusiasta', dim: 'I' },
    { text: 'Constante', dim: 'S' }, { text: 'Analítico', dim: 'C' },
  ]},
  { groupNumber: 3, isControl: false, adjectives: [
    { text: 'Competitivo', dim: 'D' }, { text: 'Persuasivo', dim: 'I' },
    { text: 'Colaborador', dim: 'S' }, { text: 'Cauteloso', dim: 'C' },
  ]},
  { groupNumber: 4, isControl: false, adjectives: [
    { text: 'Exigente', dim: 'D' }, { text: 'Expresivo', dim: 'I' },
    { text: 'Leal', dim: 'S' }, { text: 'Ordenado', dim: 'C' },
  ]},
  { groupNumber: 5, isControl: false, adjectives: [
    { text: 'Firme', dim: 'D' }, { text: 'Optimista', dim: 'I' },
    { text: 'Sereno', dim: 'S' }, { text: 'Riguroso', dim: 'C' },
  ]},
  { groupNumber: 6, isControl: false, adjectives: [
    { text: 'Audaz', dim: 'D' }, { text: 'Comunicativo', dim: 'I' },
    { text: 'Conciliador', dim: 'S' }, { text: 'Reservado', dim: 'C' },
  ]},
]

export const CONTROL_GROUP: AdjectiveGroup = {
  groupNumber: 7, isControl: true, adjectives: [
    { text: 'Resuelto', dim: 'D' }, { text: 'Afable', dim: 'I' },
    { text: 'Tranquilo', dim: 'S' }, { text: 'Detallista', dim: 'C' },
  ],
}

// Control group in position 4 of 7 to avoid distinguishability by position
export const BLOCK2_ORDER: AdjectiveGroup[] = [
  MAIN_GROUPS[0],
  MAIN_GROUPS[1],
  MAIN_GROUPS[2],
  CONTROL_GROUP,
  MAIN_GROUPS[3],
  MAIN_GROUPS[4],
  MAIN_GROUPS[5],
]
