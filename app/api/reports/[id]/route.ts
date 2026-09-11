import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { db } from '@/lib/db'
import { computeAllScores } from '@/lib/scoring'
import { selectInterviewQuestions } from '@/lib/report/questions'
import { buildReportSections, type NarrativeRow } from '@/lib/report/narrative'
import type { BlockResponseInput, LexiconEntry } from '@/lib/scoring/types'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assessmentId = params.id

  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    include: { candidate: true, blockResponses: true },
  })

  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  if (assessment.status !== 'COMPLETED') {
    return NextResponse.json({ error: 'Assessment not completed' }, { status: 422 })
  }

  // Load lexicon
  const lexiconRows = await db.lexiconTerm.findMany({ where: { active: true } })
  const lexicon: LexiconEntry[] = lexiconRows.map(r => ({
    dimension: r.dimension as 'D' | 'I' | 'S' | 'C',
    term: r.term,
    weight: r.weight,
  }))

  // Build scoring input
  const block1Responses: BlockResponseInput[] = assessment.blockResponses
    .filter(r => r.block === 1)
    .map(r => ({
      groupNumber: r.groupNumber,
      mostDim: r.mostDim as 'D' | 'I' | 'S' | 'C',
      leastDim: r.leastDim as 'D' | 'I' | 'S' | 'C',
      isControl: r.isControl,
    }))

  const block2Responses: BlockResponseInput[] = assessment.blockResponses
    .filter(r => r.block === 2)
    .map(r => ({
      groupNumber: r.groupNumber,
      mostDim: r.mostDim as 'D' | 'I' | 'S' | 'C',
      leastDim: r.leastDim as 'D' | 'I' | 'S' | 'C',
      isControl: r.isControl,
    }))

  const scores = computeAllScores({
    block1Responses,
    block2Responses,
    block3Text: assessment.block3Text ?? '',
    durationSeconds: assessment.durationSeconds ?? 0,
    lexicon,
  })

  // Load narrative content
  const narrativeRows = await db.narrativeContent.findMany()
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

  const interviewQuestions = selectInterviewQuestions(rows, scores.pc)

  const candidateName = assessment.candidate
    ? [assessment.candidate.name, assessment.candidate.lastName].filter(Boolean).join(' ')
    : 'Sin nombre'

  const sections = buildReportSections(
    rows,
    scores.pc,
    scores.maskIndex,
    scores.consistencyLevel,
    candidateName,
  )
  sections.interviewQuestions = interviewQuestions

  // Upsert report (fitScore, projectionScore, riskLevel stored as null)
  const report = await db.report.upsert({
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
      fitScore: null,
      projectionScore: null,
      riskLevel: null,
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
      fitScore: null,
      projectionScore: null,
      riskLevel: null,
    },
  })

  return NextResponse.json({ reportId: report.id, sections, scores })
}
