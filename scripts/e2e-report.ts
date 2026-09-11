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
import { buildReportSections, type NarrativeRow } from '../lib/report/narrative'
import type { BlockResponseInput, LexiconEntry } from '../lib/scoring/types'

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/conductual'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// ─── Test data ───────────────────────────────────────────────────────────────

const CANDIDATE_NAME = 'Ana Martínez'
const POSITION_NAME = 'Gerente de Ventas'

// Ideal profile for "Gerente de Ventas"
const IDEAL = { D: 80, I: 70, S: 40, C: 50 }

// Bloque 1 — 6 groups (Perfil Percibido)
// G1(most=D,least=S), G2(most=D,least=C), G3(most=D,least=S),
// G4(most=I,least=C), G5(most=D,least=S), G6(most=D,least=C)
// PP = { D:91.67, I:58.33, S:25, C:25 }
const B1: BlockResponseInput[] = [
  { groupNumber: 1, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 2, mostDim: 'D', leastDim: 'C', isControl: false },
  { groupNumber: 3, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 4, mostDim: 'I', leastDim: 'C', isControl: false },
  { groupNumber: 5, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 6, mostDim: 'D', leastDim: 'C', isControl: false },
]

// Bloque 2 — 7 groups (Perfil Interno + control)
// G1-G3(most=D,least=S), G4(most=D,least=C), G5(most=D,least=S), G6(most=D,least=C)
// G7 control (most=D,least=S) — same as G1 → 0 contradictions
// PI = { D:100, I:50, S:16.67, C:33.33 }
const B2: BlockResponseInput[] = [
  { groupNumber: 1, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 2, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 3, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 4, mostDim: 'D', leastDim: 'C', isControl: false },
  { groupNumber: 5, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 6, mostDim: 'D', leastDim: 'C', isControl: false },
  { groupNumber: 7, mostDim: 'D', leastDim: 'S', isControl: true },
]

// Bloque 3 — free text (73 words, D-dominant)
// D terms: decidida(3)+directa(3)+competitiva(3)+exigente(2)+firme(2)+audaz(2)+autoridad(2)+resultado(2)+impaciente(1)+urgencia(1)+independiente(1) = 22
// PT.D = 22/28*100 = 78.57; PT.I=PT.S=PT.C=0
const B3_TEXT =
  'Me considero una persona decidida y directa en mi forma de actuar. ' +
  'Soy competitiva por naturaleza y exigente en lo que hago. ' +
  'Actúo de manera firme y audaz cuando la situación lo requiere. ' +
  'Valoro la autoridad y el resultado de cada proyecto como mis principales referentes de desempeño. ' +
  'Puedo ser impaciente ante la urgencia, pero eso me mantiene independiente y capaz de tomar decisiones con claridad y rapidez sin depender de consensos innecesarios.'

// Duration: 8 minutes (no time penalty)
const DURATION_SECONDS = 480

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(70))
  console.log('E2E INFORME DE PERFIL CONDUCTUAL')
  console.log('='.repeat(70))
  console.log(`Candidato: ${CANDIDATE_NAME}`)
  console.log(`Cargo: ${POSITION_NAME}`)
  console.log(`Perfil ideal: D=${IDEAL.D} I=${IDEAL.I} S=${IDEAL.S} C=${IDEAL.C}`)
  console.log()

  // Load lexicon from DB
  const lexiconRows = await prisma.lexiconTerm.findMany({ where: { active: true } })
  const lexicon: LexiconEntry[] = lexiconRows.map(r => ({
    dimension: r.dimension as 'D' | 'I' | 'S' | 'C',
    term: r.term,
    weight: r.weight,
  }))
  console.log(`Léxico cargado: ${lexicon.length} términos activos`)

  // Denominators
  const dims = ['D', 'I', 'S', 'C'] as const
  for (const dim of dims) {
    const denom = lexicon.filter(e => e.dimension === dim).reduce((s, e) => s + e.weight, 0)
    console.log(`  Denominador ${dim}: ${denom}`)
  }
  console.log()

  // Scoring
  const scores = computeAllScores(
    {
      block1Responses: B1,
      block2Responses: B2,
      block3Text: B3_TEXT,
      durationSeconds: DURATION_SECONDS,
      lexicon,
    },
    IDEAL,
  )

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
  console.log(`Ajuste al Cargo (fitScore): ${fmt(scores.fitScore)}%`)
  console.log(`Proyección de Desempeño: ${fmt(scores.projectionScore)}`)
  console.log(`Nivel de Riesgo: ${scores.riskLevel}`)
  console.log()

  // Gaps
  console.log('Brechas (PC − Ideal):')
  for (const dim of dims) {
    const gap = scores.pc[dim] - IDEAL[dim]
    console.log(`  ${dim}: ${gap > 0 ? '+' : ''}${fmt(gap)} pts`)
  }
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

  // Select interview questions
  const interviewQuestions = selectInterviewQuestions(rows, scores.pc, IDEAL)

  // Build sections
  const sections = buildReportSections(
    rows,
    scores.pc,
    IDEAL,
    scores.fitScore,
    scores.maskIndex,
    scores.consistencyLevel,
    scores.riskLevel,
    interviewQuestions,
    CANDIDATE_NAME,
  )

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
  for (const dim of dims) {
    const label = { D: 'Iniciativa', I: 'Vínculo', S: 'Cadencia', C: 'Precisión' }[dim]
    console.log(`  ${label}: ${Math.round(scores.pc[dim])}`)
  }

  console.log('\n4. COMPARACIÓN CON PERFIL IDEAL (ver gráfico radar en PDF)')
  console.log('-'.repeat(40))
  for (const dim of dims) {
    const label = { D: 'Iniciativa', I: 'Vínculo', S: 'Cadencia', C: 'Precisión' }[dim]
    console.log(`  ${label}: PC=${Math.round(scores.pc[dim])} vs Ideal=${IDEAL[dim]}`)
  }

  console.log('\n5. ANÁLISIS DE BRECHA')
  console.log('-'.repeat(40))
  for (const g of sections.gapAnalysis) {
    console.log(`[${g.label} ${g.gap > 0 ? '+' : ''}${Math.round(g.gap)} pts]`)
    console.log(g.text)
    console.log()
  }

  console.log('\n6. ESTILO DE COMUNICACIÓN')
  console.log('-'.repeat(40))
  console.log(sections.communication)

  console.log('\n7. MOTIVADORES Y DESMOTIVADORES')
  console.log('-'.repeat(40))
  console.log(sections.motivators)

  console.log('\n8. COMPORTAMIENTO BAJO PRESIÓN')
  console.log('-'.repeat(40))
  console.log(sections.pressure)

  console.log('\n9. SEÑALES DE ALERTA')
  console.log('-'.repeat(40))
  console.log(sections.alerts)

  console.log('\n10. PREGUNTAS SUGERIDAS DE ENTREVISTA')
  console.log('-'.repeat(40))
  console.log(`Total: ${sections.interviewQuestions.length} preguntas`)
  sections.interviewQuestions.forEach((q, i) => {
    console.log(`${i + 1}. ${q}`)
  })

  console.log('\n11. PROYECCIÓN DE DESEMPEÑO')
  console.log('-'.repeat(40))
  console.log(sections.projection)

  console.log('\n12. NOTA DE USO')
  console.log('-'.repeat(40))
  console.log(
    'Este informe es una herramienta de apoyo para el proceso de selección de personal ' +
    'y no constituye, por sí solo, el criterio de decisión. El instrumento está basado ' +
    'en la teoría pública DISC (Marston, 1928) y representa una arquitectura de trabajo ' +
    'no validada psicométricamente. Los resultados deben interpretarse en conjunto con ' +
    'entrevistas, verificación de referencias y otras fuentes de información. Toda ' +
    'decisión de contratación es responsabilidad exclusiva del consultor y de la organización.',
  )

  console.log('\n' + '='.repeat(70))
  console.log('FIN DEL INFORME')
  console.log('='.repeat(70))
}

main().catch(console.error).finally(() => prisma.$disconnect())
