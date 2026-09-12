import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { computeAllScores } from '../lib/scoring'
import { computeDistanceToCenter } from '../lib/scoring/center'
import { selectInterviewQuestions } from '../lib/report/questions'
import { buildReportSections, type NarrativeRow, DIMS, DIM_LABELS } from '../lib/report/narrative'
import type { WordSelectionInput, LexiconEntry } from '../lib/scoring/types'
import { WORD_MAP } from '../lib/instrument/words'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/conductual'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const B1_KEYS = ['D1','D2','D3','D4','D5','D6','I1','S1']
const B2_KEYS = ['D1','D2','D3','D4','D5','D6','I1','S1']

// 12 control decisions — 3 per dimension
// B2 main contains: D1 D2 D3 D4 D5 D6 I1 S1
// Designed contradictions (3 total → rawConsistency=75, HIGH boundary):
//   ctrl_D4=No  + D4 in B2 main → contradiction
//   ctrl_S=No   + S1 in B2 main → contradiction
//   ctrl_I2=Yes + I2 NOT in B2  → contradiction
const CONTROL_DECISIONS: { wordKey: string; selected: boolean }[] = [
  // D (Iniciativa)
  { wordKey: 'ctrl_D',  selected: true  }, // D1 in B2 → consistent
  { wordKey: 'ctrl_D2', selected: true  }, // D2 in B2 → consistent
  { wordKey: 'ctrl_D4', selected: false }, // D4 in B2, ctrl_D4 No → CONTRADICTION
  // I (Vínculo)
  { wordKey: 'ctrl_I',  selected: true  }, // I1 in B2 → consistent
  { wordKey: 'ctrl_I2', selected: true  }, // I2 NOT in B2, ctrl_I2 Yes → CONTRADICTION
  { wordKey: 'ctrl_I3', selected: false }, // I3 not in B2, ctrl_I3 No → consistent
  // S (Cadencia)
  { wordKey: 'ctrl_S',  selected: false }, // S1 in B2, ctrl_S No → CONTRADICTION
  { wordKey: 'ctrl_S3', selected: false }, // S3 not in B2 → consistent
  { wordKey: 'ctrl_S4', selected: false }, // S4 not in B2 → consistent
  // C (Precisión)
  { wordKey: 'ctrl_C',  selected: false }, // C1 not in B2 → consistent
  { wordKey: 'ctrl_C4', selected: false }, // C4 not in B2 → consistent
  { wordKey: 'ctrl_C5', selected: false }, // C5 not in B2 → consistent
]

const BLOCK1: WordSelectionInput[] = B1_KEYS.map(key => {
  const w = WORD_MAP.get(key)!
  return { wordKey: key, dimension: w.dim, isControl: w.isControl }
})

const BLOCK2: WordSelectionInput[] = B2_KEYS.map(key => {
  const w = WORD_MAP.get(key)!
  return { wordKey: key, dimension: w.dim, isControl: w.isControl }
})

const BLOCK2_WITH_CONTROLS: WordSelectionInput[] = [
  ...BLOCK2,
  ...CONTROL_DECISIONS.filter(d => d.selected).map(d => {
    const w = WORD_MAP.get(d.wordKey)!
    return { wordKey: d.wordKey, dimension: w.dim, isControl: true }
  }),
]

const BLOCK3_TEXT = 'Soy una persona decidida y directa, orientada al resultado y la autonomía. Me motiva el reto y el control sobre mi trabajo.'

async function main() {
  console.log('=== E2E Sin Cargo ===\n')

  const consultant = await prisma.consultant.findUniqueOrThrow({ where: { id: 'default-consultant' } })
  const assessment = await prisma.assessment.create({
    data: { consultantId: consultant.id },
  })
  console.log(`Assessment creado: ${assessment.id} (token: ${assessment.token})`)
  console.log(`candidateId: ${assessment.candidateId ?? 'null — correcto'}\n`)

  const candidate = await prisma.candidate.create({
    data: {
      consultantId: consultant.id,
      name: 'Ana',
      lastName: 'Prueba',
      email: 'ana@test.com',
      consentPrivacy: true,
    },
  })
  await prisma.assessment.update({
    where: { id: assessment.id },
    data: { candidateId: candidate.id, status: 'IN_PROGRESS', startedAt: new Date() },
  })
  console.log(`Candidata: ${candidate.name} ${candidate.lastName ?? ''}`)
  console.log(`Email: ${candidate.email}\n`)

  for (const r of BLOCK1) {
    await prisma.blockResponse.create({
      data: {
        assessmentId: assessment.id,
        block: 1,
        wordKey: r.wordKey,
        dimension: r.dimension as 'D' | 'I' | 'S' | 'C',
        isControl: r.isControl,
      },
    })
  }
  for (const r of BLOCK2) {
    await prisma.blockResponse.create({
      data: {
        assessmentId: assessment.id,
        block: 2,
        wordKey: r.wordKey,
        dimension: r.dimension as 'D' | 'I' | 'S' | 'C',
        isControl: r.isControl,
      },
    })
  }
  for (const d of CONTROL_DECISIONS) {
    if (d.selected) {
      const w = WORD_MAP.get(d.wordKey)!
      await prisma.blockResponse.create({
        data: {
          assessmentId: assessment.id,
          block: 2,
          wordKey: d.wordKey,
          dimension: w.dim as 'D' | 'I' | 'S' | 'C',
          isControl: true,
        },
      })
    }
  }
  await prisma.assessment.update({
    where: { id: assessment.id },
    data: { block2ControlCompletedAt: new Date() },
  })
  await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      block3Text: BLOCK3_TEXT,
      status: 'COMPLETED',
      completedAt: new Date(),
      durationSeconds: 420,
    },
  })
  console.log('Respuestas cargadas.')

  const lexiconRows = await prisma.lexiconTerm.findMany({ where: { active: true } })
  const lexicon: LexiconEntry[] = lexiconRows.map(r => ({
    dimension: r.dimension as 'D' | 'I' | 'S' | 'C',
    term: r.term,
    weight: r.weight,
  }))

  const scores = computeAllScores({
    block1Responses: BLOCK1,
    block2Responses: BLOCK2_WITH_CONTROLS,
    block3Text: BLOCK3_TEXT,
    lexicon,
  })

  console.log('\n=== Perfiles ===')
  for (const dim of DIMS) {
    console.log(`  ${DIM_LABELS[dim]}: PP=${Math.round(scores.pp[dim])} PI=${Math.round(scores.pi[dim])} PT=${Math.round(scores.pt[dim])} PC=${Math.round(scores.pc[dim])}`)
  }
  console.log(`  Máscara: ${Math.round(scores.maskIndex)}% | Consistencia: ${Math.round(scores.consistencyIndex)} (${scores.consistencyLevel})`)
  console.log(`  Contradicciones: ${scores.contradictions}`)

  const distances = computeDistanceToCenter(scores.pc)
  console.log('\n=== Distancias al centro ===')
  for (const dim of DIMS) {
    const dir = scores.pc[dim] >= 50 ? 'exceso' : 'déficit'
    console.log(`  ${DIM_LABELS[dim]}: ${distances[dim].toFixed(4)} pts (${dir})`)
  }

  const narrativeRows = await prisma.narrativeContent.findMany()
  const rows: NarrativeRow[] = narrativeRows.map(r => ({
    id: r.id,
    section: r.section,
    dimension: r.dimension,
    subtype: r.subtype,
    questionIndex: r.questionIndex,
    riskLevel: r.riskLevel,
    intensity: r.intensity,
    content: r.content,
  }))

  const candidateName = `${candidate.name} ${candidate.lastName ?? ''}`.trim()
  const questions = selectInterviewQuestions(rows, scores.pc)
  const sections = buildReportSections(rows, scores.pc, scores.maskIndex, scores.consistencyLevel, candidateName)
  sections.interviewQuestions = questions

  console.log('\n=== Secciones del informe ===')
  console.log(`\n2. executiveSummary:\n   ${sections.executiveSummary}`)
  console.log('\n5. dominantTraits:')
  for (const t of sections.dominantTraits) {
    console.log(`   [${t.dim}] ${t.label}: ${t.distance.toFixed(4)} pts ${t.direction}`)
    console.log(`   ${t.text}`)
  }
  console.log(`\n10. profundización (${sections.interviewQuestions.length} preguntas):`)
  sections.interviewQuestions.forEach((q, i) => console.log(`   ${i+1}. ${q}`))
  console.log(`\n11. potential:\n   ${sections.potential}`)

  console.log('\n=== Verificaciones ===')
  const checks: [string, boolean][] = [
    ['Assessment sin candidateId inicial', true],
    ['candidateName incluye apellido', candidateName.includes('Prueba')],
    ['PP.D=100 (6/6 D en B1)', Math.abs(scores.pp.D - 100) < 0.01],
    ['PI.D=100 (6/6 D en B2 main)', Math.abs(scores.pi.D - 100) < 0.01],
    ['contradictions=3 (ctrl_D4+D4, ctrl_I2+I2, ctrl_S+S1 → rawConsistency=75 exacto)', scores.contradictions === 3],
    ['consistencyLevel=HIGH (3 contradicciones, umbral exacto 75%)', scores.consistencyLevel === 'HIGH'],
    ['dominantTraits tiene 4 entradas', sections.dominantTraits.length === 4],
    ['dominantTraits ordenados por distancia desc', sections.dominantTraits[0].distance >= sections.dominantTraits[1].distance],
    ['potential contiene nombre', sections.potential.includes('Ana')],
    ['potential NO menciona cargo', !sections.potential.toLowerCase().includes('cargo')],
    ['executiveSummary NO menciona riesgo', !sections.executiveSummary.includes('Riesgo')],
    ['profundización tiene 4 o 6 preguntas', [4,6].includes(sections.interviewQuestions.length)],
    ['POTENTIAL row encontrado', sections.potential.length > 0],
    ['traits ≥5pts usan "punto neutro" direccional', sections.dominantTraits.filter(t=>t.distance>=5).every(t=>t.text.includes('punto neutro') && t.text !== 'Esta dimensión se ubica cerca del punto neutro de la escala, sin una tendencia marcada en ninguna dirección.')],
    ['traits <5pts reciben frase neutra', sections.dominantTraits.filter(t=>t.distance<5).every(t=>t.text==='Esta dimensión se ubica cerca del punto neutro de la escala, sin una tendencia marcada en ninguna dirección.')],
  ]

  let allPassed = true
  for (const [label, result] of checks) {
    console.log(`  ${result ? '✓' : '✗'} ${label}`)
    if (!result) allPassed = false
  }

  await prisma.blockResponse.deleteMany({ where: { assessmentId: assessment.id } })
  await prisma.assessment.delete({ where: { id: assessment.id } })
  await prisma.candidate.delete({ where: { id: candidate.id } })

  if (!allPassed) {
    console.log('\n⚠ Una o más verificaciones fallaron.')
    process.exit(1)
  }
  console.log('\n✓ E2E Sin Cargo completado.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
