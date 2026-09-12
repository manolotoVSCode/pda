/**
 * E2E report script: inserts a fictional candidate, builds scoring input,
 * runs the full scoring pipeline, selects narrative content from the DB,
 * and prints the assembled report content to stdout.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/e2e-report.ts
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { computeAllScores } from '../lib/scoring'
import { selectInterviewQuestions } from '../lib/report/questions'
import { buildReportSections, type NarrativeRow, DIMS, DIM_LABELS } from '../lib/report/narrative'
import type { WordSelectionInput, LexiconEntry } from '../lib/scoring/types'
import { WORD_MAP } from '../lib/instrument/words'

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/conductual'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// ─── Test data ───────────────────────────────────────────────────────────────

const CANDIDATE_NAME = 'Ana Martínez'

// Bloque 1 — 8 words (Perfil Percibido)
const B1_KEYS = ['D1','D2','D3','D4','D5','D6','I1','S1']
const B1: WordSelectionInput[] = B1_KEYS.map(key => {
  const w = WORD_MAP.get(key)!
  return { wordKey: key, dimension: w.dim, isControl: w.isControl }
})

// Bloque 2 — 9 words (Perfil Interno + control)
const B2_KEYS = ['D1','D2','D3','D4','D5','D6','ctrl_D','I1','S1']
const B2: WordSelectionInput[] = B2_KEYS.map(key => {
  const w = WORD_MAP.get(key)!
  return { wordKey: key, dimension: w.dim, isControl: w.isControl }
})

const B3_TEXT =
  'Me considero una persona decidida y directa en mi forma de actuar. ' +
  'Soy competitiva por naturaleza y exigente en lo que hago. ' +
  'Actúo de manera firme y audaz cuando la situación lo requiere. ' +
  'Valoro la autoridad y el resultado de cada proyecto como mis principales referentes de desempeño. ' +
  'Puedo ser impaciente ante la urgencia, pero eso me mantiene independiente y capaz de tomar decisiones con claridad y rapidez sin depender de consensos innecesarios.'

const DURATION_SECONDS = 480

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(70))
  console.log('E2E INFORME DE PERFIL CONDUCTUAL (Sin Cargo)')
  console.log('='.repeat(70))
  console.log(`Candidato: ${CANDIDATE_NAME}`)
  console.log()

  // Load lexicon from DB
  const lexiconRows = await prisma.lexiconTerm.findMany({ where: { active: true } })
  const lexicon: LexiconEntry[] = lexiconRows.map(r => ({
    dimension: r.dimension as 'D' | 'I' | 'S' | 'C',
    term: r.term,
    weight: r.weight,
  }))
  console.log(`Léxico cargado: ${lexicon.length} términos activos`)

  // Scoring (no ideal)
  const scores = computeAllScores({
    block1Responses: B1,
    block2Responses: B2,
    block3Text: B3_TEXT,
    lexicon,
  })

  // Print scores
  console.log('─'.repeat(70))
  console.log('SCORES')
  console.log('─'.repeat(70))
  const fmt = (v: number) => v.toFixed(2)
  console.log('Perfil Percibido (PP):')
  console.log(`  D=${fmt(scores.pp.D)}  I=${fmt(scores.pp.I)}  S=${fmt(scores.pp.S)}  C=${fmt(scores.pp.C)}`)
  console.log('Perfil Interno (PI):')
  console.log(`  D=${fmt(scores.pi.D)}  I=${fmt(scores.pi.I)}  S=${fmt(scores.pi.S)}  C=${fmt(scores.pi.C)}`)
  console.log('Perfil Textual (PT):')
  console.log(`  D=${fmt(scores.pt.D)}  I=${fmt(scores.pt.I)}  S=${fmt(scores.pt.S)}  C=${fmt(scores.pt.C)}`)
  console.log('Perfil Compuesto (PC):')
  console.log(`  D=${fmt(scores.pc.D)}  I=${fmt(scores.pc.I)}  S=${fmt(scores.pc.S)}  C=${fmt(scores.pc.C)}`)
  console.log(`Índice de Máscara Social: ${fmt(scores.maskIndex)}%`)
  console.log(`Índice de Consistencia: ${fmt(scores.consistencyIndex)} (${scores.consistencyLevel})`)
  console.log(`Contradicciones: ${scores.contradictions}`)
  console.log()

  // Load narrative content
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
  console.log(`Contenido narrativo cargado: ${rows.length} filas`)
  console.log()

  // Select interview questions (distance to center)
  const interviewQuestions = selectInterviewQuestions(rows, scores.pc)

  // Build sections (new signature — no ideal, no fit/projection/risk)
  const sections = buildReportSections(
    rows,
    scores.pc,
    scores.maskIndex,
    scores.consistencyLevel,
    CANDIDATE_NAME,
  )
  sections.interviewQuestions = interviewQuestions

  // Print full report
  console.log('='.repeat(70))
  console.log('INFORME COMPLETO')
  console.log('='.repeat(70))

  console.log('\n1. INDICADOR DE CONSISTENCIA')
  console.log('-'.repeat(40))
  if (sections.consistencyWarning) {
    console.log('⚠️  ' + sections.consistencyWarning)
  } else {
    console.log(`Nivel: ${scores.consistencyLevel} (${Math.round(scores.consistencyIndex)}/100)`)
  }

  console.log('\n2. RESUMEN EJECUTIVO')
  console.log('-'.repeat(40))
  console.log(sections.executiveSummary)

  console.log('\n3. PERFIL COMPUESTO (ver gráfico de barras en PDF)')
  console.log('-'.repeat(40))
  for (const dim of DIMS) {
    console.log(`  ${DIM_LABELS[dim]}: ${Math.round(scores.pc[dim])}`)
  }

  console.log('\n4. PERFIL INTERNO VS PERCIBIDO (ver gráfico radar en PDF)')
  console.log('-'.repeat(40))
  for (const dim of DIMS) {
    console.log(`  ${DIM_LABELS[dim]}: PP=${Math.round(scores.pp[dim])} PI=${Math.round(scores.pi[dim])}`)
  }

  console.log('\n5. ANÁLISIS DE RASGOS DOMINANTES')
  console.log('-'.repeat(40))
  for (const t of sections.dominantTraits) {
    console.log(`[${t.label} ${Math.round(t.distance)} pts ${t.direction}]`)
    console.log(t.text)
    console.log()
  }

  console.log('\n6. DESCRIPCIÓN DEL PERFIL')
  console.log('-'.repeat(40))
  console.log(sections.profileDescription)

  console.log('\n7. SEÑALES DE ALERTA')
  console.log('-'.repeat(40))
  console.log(sections.alerts)

  console.log('\n8. PREGUNTAS DE PROFUNDIZACIÓN')
  console.log('-'.repeat(40))
  console.log(`Total: ${sections.interviewQuestions.length} preguntas`)
  sections.interviewQuestions.forEach((q, i) => {
    console.log(`${i + 1}. ${q}`)
  })

  console.log('\n9. POTENCIAL Y RECOMENDACIONES DE DESARROLLO')
  console.log('-'.repeat(40))
  console.log(sections.potential)

  console.log('\n11. NOTA DE USO')
  console.log('-'.repeat(40))
  console.log(
    'Este informe describe el estilo conductual de la persona evaluada y no mide habilidades, ' +
    'conocimientos ni garantiza desempeño en ningún contexto específico. El instrumento está basado ' +
    'en la teoría pública DISC (Marston, 1928) y representa una arquitectura de trabajo ' +
    'no validada psicométricamente. Los resultados deben interpretarse como orientación y ' +
    'complementarse con otras fuentes de información.',
  )

  console.log('\n' + '='.repeat(70))
  console.log('FIN DEL INFORME')
  console.log('='.repeat(70))
}

main().catch(console.error).finally(() => prisma.$disconnect())
