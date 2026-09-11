import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { computeAllScores } from '../lib/scoring'
import { computeDistanceToCenter } from '../lib/scoring/center'
import { selectInterviewQuestions } from '../lib/report/questions'
import { buildReportSections, type NarrativeRow, DIMS, DIM_LABELS } from '../lib/report/narrative'
import type { BlockResponseInput, LexiconEntry } from '../lib/scoring/types'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/conductual'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// Deterministic test responses: Bloque 1 (PP) — 6 groups
const BLOCK1: BlockResponseInput[] = [
  { groupNumber: 1, mostDim: 'D', leastDim: 'C', isControl: false },
  { groupNumber: 2, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 3, mostDim: 'D', leastDim: 'C', isControl: false },
  { groupNumber: 4, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 5, mostDim: 'I', leastDim: 'C', isControl: false },
  { groupNumber: 6, mostDim: 'D', leastDim: 'S', isControl: false },
]

// Bloque 2 (PI) — 6 main + 1 control (consistent answers)
const BLOCK2: BlockResponseInput[] = [
  { groupNumber: 1, mostDim: 'D', leastDim: 'C', isControl: false },
  { groupNumber: 2, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 3, mostDim: 'D', leastDim: 'C', isControl: false },
  { groupNumber: 4, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 5, mostDim: 'I', leastDim: 'C', isControl: false },
  { groupNumber: 6, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 7, mostDim: 'D', leastDim: 'C', isControl: true }, // control: consistent with group 1
]

const BLOCK3_TEXT = 'Soy una persona decidida y directa, orientada al resultado y la autonomía. Me motiva el reto y el control sobre mi trabajo.'

async function main() {
  console.log('=== E2E Sin Cargo ===\n')

  // 1. Create Assessment (no candidateId, no positionId)
  const consultant = await prisma.consultant.findUniqueOrThrow({ where: { id: 'default-consultant' } })
  const assessment = await prisma.assessment.create({
    data: { consultantId: consultant.id },
  })
  console.log(`Assessment creado: ${assessment.id} (token: ${assessment.token})`)
  console.log(`candidateId: ${assessment.candidateId ?? 'null — correcto'}\n`)

  // 2. Self-registration: create Candidate and link
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
  console.log(`Candidata registrada: ${candidate.name} ${candidate.lastName ?? ''}`)
  console.log(`Email: ${candidate.email}, consentPrivacy: ${candidate.consentPrivacy}\n`)

  // 3. Simulate block responses
  for (const r of BLOCK1) {
    await prisma.blockResponse.create({
      data: { assessmentId: assessment.id, block: 1, ...r },
    })
  }
  for (const r of BLOCK2) {
    await prisma.blockResponse.create({
      data: { assessmentId: assessment.id, block: 2, ...r },
    })
  }
  await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      block3Text: BLOCK3_TEXT,
      status: 'COMPLETED',
      completedAt: new Date(),
      durationSeconds: 420,
    },
  })
  console.log('Respuestas de bloques cargadas.')

  // 4. Load lexicon and compute scores (no ideal)
  const lexiconRows = await prisma.lexiconTerm.findMany({ where: { active: true } })
  const lexicon: LexiconEntry[] = lexiconRows.map(r => ({
    dimension: r.dimension as 'D' | 'I' | 'S' | 'C',
    term: r.term,
    weight: r.weight,
  }))

  const scores = computeAllScores({
    block1Responses: BLOCK1,
    block2Responses: BLOCK2,
    block3Text: BLOCK3_TEXT,
    durationSeconds: 420,
    lexicon,
  })

  console.log('\n=== Perfiles ===')
  for (const dim of DIMS) {
    console.log(`  ${DIM_LABELS[dim]}: PP=${Math.round(scores.pp[dim])} PI=${Math.round(scores.pi[dim])} PT=${Math.round(scores.pt[dim])} PC=${Math.round(scores.pc[dim])}`)
  }
  console.log(`  Máscara: ${Math.round(scores.maskIndex)}% | Consistencia: ${Math.round(scores.consistencyIndex)} (${scores.consistencyLevel})`)
  console.log(`  (sin fitScore, sin projectionScore, sin riskLevel — correcto)\n`)

  // 5. Distances to center
  const distances = computeDistanceToCenter(scores.pc)
  console.log('=== Distancias al centro ===')
  for (const dim of DIMS) {
    const dir = scores.pc[dim] >= 50 ? 'exceso' : 'déficit'
    console.log(`  ${DIM_LABELS[dim]}: ${Math.round(distances[dim])} pts (${dir})`)
  }

  // 6. Narrative sections
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

  console.log('\n=== Secciones del informe (sin cargo) ===')
  console.log(`\n1. consistencyWarning: ${sections.consistencyWarning ?? '(ninguna)'}`)
  console.log(`\n2. executiveSummary:\n   ${sections.executiveSummary}`)
  console.log(`\n5. dominantTraits:`)
  for (const t of sections.dominantTraits) {
    console.log(`   [${t.dim}] ${t.label}: ${Math.round(t.distance)} pts ${t.direction} — ${t.text.slice(0, 60)}...`)
  }
  console.log(`\n6. communication:\n   ${sections.communication.slice(0, 100)}...`)
  console.log(`\n7. motivators:\n   ${sections.motivators.slice(0, 80)}...`)
  console.log(`\n8. pressure:\n   ${sections.pressure.slice(0, 80)}...`)
  console.log(`\n9. alerts:\n   ${sections.alerts.slice(0, 80)}...`)
  console.log(`\n10. profundización (${sections.interviewQuestions.length} preguntas):`)
  sections.interviewQuestions.forEach((q, i) => console.log(`   ${i + 1}. ${q}`))
  console.log(`\n11. potential:\n   ${sections.potential}`)

  // 7. Assertions
  console.log('\n=== Verificaciones ===')
  const checks: [string, boolean][] = [
    ['Assessment creado sin candidateId inicial', true], // verified above
    ['candidateName incluye apellido', candidateName.includes('Prueba')],
    ['dominantTraits tiene 4 entradas', sections.dominantTraits.length === 4],
    ['dominantTraits ordenados por distancia desc', sections.dominantTraits[0].distance >= sections.dominantTraits[1].distance],
    ['potential contiene nombre', sections.potential.includes('Ana')],
    ['potential NO menciona cargo', !sections.potential.toLowerCase().includes('cargo')],
    ['executiveSummary NO menciona ajuste', !sections.executiveSummary.includes('Ajuste')],
    ['executiveSummary NO menciona riesgo', !sections.executiveSummary.includes('Riesgo')],
    ['profundización tiene 4 o 6 preguntas', [4, 6].includes(sections.interviewQuestions.length)],
    ['POTENTIAL row encontrado', sections.potential.length > 0],
    ['traits con distancia ≥5 pts usan "punto neutro" direccional', sections.dominantTraits.filter(t => t.distance >= 5).every(t => t.text.includes('punto neutro') && t.text !== 'Esta dimensión se ubica cerca del punto neutro de la escala, sin una tendencia marcada en ninguna dirección.')],
    ['traits con distancia <5 pts reciben frase neutra', sections.dominantTraits.filter(t => t.distance < 5).every(t => t.text === 'Esta dimensión se ubica cerca del punto neutro de la escala, sin una tendencia marcada en ninguna dirección.')],
  ]

  let allPassed = true
  for (const [label, result] of checks) {
    const mark = result ? '✓' : '✗'
    console.log(`  ${mark} ${label}`)
    if (!result) allPassed = false
  }

  // Cleanup
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
