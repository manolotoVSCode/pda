/**
 * debug-report.ts
 * Reproduces the POST /api/reports/[id] logic for a given assessment ID
 * to surface the exact error thrown in production.
 *
 * Usage: npx tsx scripts/debug-report.ts <assessmentId>
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { computeAllScores } from '../lib/scoring'
import { selectInterviewQuestions } from '../lib/report/questions'
import { buildReportSections, type NarrativeRow } from '../lib/report/narrative'
import type { WordSelectionInput, LexiconEntry } from '../lib/scoring/types'
import { createHash } from 'crypto'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const assessmentId = process.argv[2]
  if (!assessmentId) {
    console.error('Usage: npx tsx scripts/debug-report.ts <assessmentId>')
    process.exit(1)
  }

  console.log(`\nReproducing POST /api/reports/${assessmentId}\n`)

  // Step 1: load assessment
  console.log('Step 1: loading assessment...')
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { candidate: true, blockResponses: true },
  })
  if (!assessment) { console.error('FAIL: assessment not found'); process.exit(1) }
  console.log(`  status=${assessment.status}  blockResponses=${assessment.blockResponses.length}  block3Text=${JSON.stringify(assessment.block3Text?.slice(0, 60))}`)

  if (assessment.status !== 'COMPLETED') {
    console.error(`FAIL: status is ${assessment.status}, expected COMPLETED`)
    process.exit(1)
  }

  // Step 2: load lexicon
  console.log('Step 2: loading lexicon...')
  const lexiconRows = await prisma.lexiconTerm.findMany({ where: { active: true } })
  console.log(`  active terms: ${lexiconRows.length}`)
  const lexicon: LexiconEntry[] = lexiconRows.map(r => ({
    dimension: r.dimension as 'D' | 'I' | 'S' | 'C',
    term: r.term,
    weight: r.weight,
  }))
  const lexiconVersion = createHash('sha256')
    .update(lexiconRows.map(r => `${r.dimension}:${r.term}:${r.weight}`).sort().join('\n'))
    .digest('hex').slice(0, 8)
  console.log(`  lexiconVersion=${lexiconVersion}`)

  // Step 3: build scoring inputs
  console.log('Step 3: building scoring inputs...')
  const block1Responses: WordSelectionInput[] = assessment.blockResponses
    .filter(r => r.block === 1)
    .map(r => ({ wordKey: r.wordKey, dimension: r.dimension as 'D' | 'I' | 'S' | 'C', isControl: r.isControl }))
  const block2Responses: WordSelectionInput[] = assessment.blockResponses
    .filter(r => r.block === 2)
    .map(r => ({ wordKey: r.wordKey, dimension: r.dimension as 'D' | 'I' | 'S' | 'C', isControl: r.isControl }))
  console.log(`  block1=${block1Responses.length} responses, block2=${block2Responses.length} responses`)
  console.log(`  block2 control responses: ${block2Responses.filter(r => r.isControl).length}`)

  // Step 4: compute scores
  console.log('Step 4: computing scores...')
  let scores: ReturnType<typeof computeAllScores>
  try {
    scores = computeAllScores({
      block1Responses,
      block2Responses,
      block3Text: assessment.block3Text ?? '',
      lexicon,
    })
    console.log(`  PP: D=${scores.pp.D.toFixed(2)} I=${scores.pp.I.toFixed(2)} S=${scores.pp.S.toFixed(2)} C=${scores.pp.C.toFixed(2)}`)
    console.log(`  PI: D=${scores.pi.D.toFixed(2)} I=${scores.pi.I.toFixed(2)} S=${scores.pi.S.toFixed(2)} C=${scores.pi.C.toFixed(2)}`)
    console.log(`  PT defined=${scores.ptDefined}  D=${scores.pt.D.toFixed(2)} I=${scores.pt.I.toFixed(2)} S=${scores.pt.S.toFixed(2)} C=${scores.pt.C.toFixed(2)}`)
    console.log(`  PC: D=${scores.pc.D.toFixed(2)} I=${scores.pc.I.toFixed(2)} S=${scores.pc.S.toFixed(2)} C=${scores.pc.C.toFixed(2)}`)
    console.log(`  maskIndex=${scores.maskIndex.toFixed(2)}  consistencyIndex=${scores.consistencyIndex.toFixed(2)}  consistencyLevel=${scores.consistencyLevel}  contradictions=${scores.contradictions}`)
  } catch (err) {
    console.error('FAIL at computeAllScores:', err)
    process.exit(1)
  }

  // Step 5: load narrative rows
  console.log('Step 5: loading narrative content...')
  const narrativeRows = await prisma.narrativeContent.findMany()
  console.log(`  total rows: ${narrativeRows.length}`)
  const rows: NarrativeRow[] = narrativeRows.map(r => ({
    id: r.id,
    section: r.section as string,
    dimension: r.dimension as string | null,
    subtype: r.subtype,
    questionIndex: r.questionIndex,
    riskLevel: r.riskLevel as string | null,
    intensity: r.intensity as string | null,
    content: r.content,
  }))
  const sectionCounts: Record<string, number> = {}
  for (const r of rows) sectionCounts[r.section] = (sectionCounts[r.section] ?? 0) + 1
  console.log('  sections:', JSON.stringify(sectionCounts))

  // Step 6: select interview questions
  console.log('Step 6: selecting interview questions...')
  let interviewQuestions: string[]
  try {
    interviewQuestions = selectInterviewQuestions(rows, scores.pc)
    console.log(`  selected ${interviewQuestions.length} questions`)
  } catch (err) {
    console.error('FAIL at selectInterviewQuestions:', err)
    process.exit(1)
  }

  // Step 7: build report sections
  console.log('Step 7: building report sections...')
  const candidateName = assessment.candidate
    ? [assessment.candidate.name, assessment.candidate.lastName].filter(Boolean).join(' ')
    : 'Sin nombre'
  console.log(`  candidateName="${candidateName}"`)
  let sections: ReturnType<typeof buildReportSections>
  try {
    sections = buildReportSections(rows, scores.pc, scores.maskIndex, scores.consistencyLevel, candidateName)
    sections.interviewQuestions = interviewQuestions
    console.log(`  executiveSummary="${sections.executiveSummary.slice(0, 80)}..."`)
    console.log(`  profileDescription paragraphs=${sections.profileDescription.length}`)
    console.log(`  dominantTraits=${sections.dominantTraits.length}`)
    console.log(`  interviewQuestions=${sections.interviewQuestions.length}`)
  } catch (err) {
    console.error('FAIL at buildReportSections:', err)
    process.exit(1)
  }

  // Step 8: upsert report
  console.log('Step 8: upserting report...')
  try {
    const report = await prisma.report.upsert({
      where: { assessmentId },
      update: {
        ppD: scores.pp.D, ppI: scores.pp.I, ppS: scores.pp.S, ppC: scores.pp.C,
        piD: scores.pi.D, piI: scores.pi.I, piS: scores.pi.S, piC: scores.pi.C,
        ptD: scores.pt.D, ptI: scores.pt.I, ptS: scores.pt.S, ptC: scores.pt.C,
        pcD: scores.pc.D, pcI: scores.pc.I, pcS: scores.pc.S, pcC: scores.pc.C,
        maskIndex: scores.maskIndex,
        consistencyIndex: scores.consistencyIndex,
        consistencyLevel: scores.consistencyLevel,
        contradictions: scores.contradictions,
        lexiconVersion,
        fitScore: null, projectionScore: null, riskLevel: null,
      },
      create: {
        assessmentId,
        ppD: scores.pp.D, ppI: scores.pp.I, ppS: scores.pp.S, ppC: scores.pp.C,
        piD: scores.pi.D, piI: scores.pi.I, piS: scores.pi.S, piC: scores.pi.C,
        ptD: scores.pt.D, ptI: scores.pt.I, ptS: scores.pt.S, ptC: scores.pt.C,
        pcD: scores.pc.D, pcI: scores.pc.I, pcS: scores.pc.S, pcC: scores.pc.C,
        maskIndex: scores.maskIndex,
        consistencyIndex: scores.consistencyIndex,
        consistencyLevel: scores.consistencyLevel,
        contradictions: scores.contradictions,
        lexiconVersion,
        fitScore: null, projectionScore: null, riskLevel: null,
      },
    })
    console.log(`  report.id=${report.id}`)
    console.log('\n✓ All steps passed — report generated successfully.')
    console.log(`  Navigate to: /reports/${report.id}`)
  } catch (err) {
    console.error('FAIL at prisma.report.upsert:', err)
    process.exit(1)
  }
}

main().catch(err => { console.error('Unhandled error:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
