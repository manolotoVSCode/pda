import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { db } from '@/lib/db'
import { renderToBuffer } from '@react-pdf/renderer'
import { ReportDocument } from '@/lib/report/pdf'
import { selectInterviewQuestions } from '@/lib/report/questions'
import { buildReportSections, type NarrativeRow } from '@/lib/report/narrative'
import { buildBarChartSvg, buildRadarChartSvg } from '@/lib/report/charts'
import React from 'react'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await db.report.findUnique({
    where: { id: params.id },
    include: {
      assessment: {
        include: {
          candidate: true,
        },
      },
    },
  })

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const pc = { D: report.pcD, I: report.pcI, S: report.pcS, C: report.pcC }
  const pp = { D: report.ppD, I: report.ppI, S: report.ppS, C: report.ppC }
  const pi = { D: report.piD, I: report.piI, S: report.piS, C: report.piC }

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

  const candidateName = report.assessment.candidate
    ? [report.assessment.candidate.name, report.assessment.candidate.lastName].filter(Boolean).join(' ')
    : 'Sin nombre'

  const interviewQuestions = selectInterviewQuestions(rows, pc)

  const sections = buildReportSections(
    rows,
    pc,
    report.maskIndex,
    report.consistencyLevel as 'HIGH' | 'MODERATE' | 'LOW',
    candidateName,
  )
  sections.interviewQuestions = interviewQuestions

  const barChartSvg = buildBarChartSvg(pc)
  const radarChartSvg = buildRadarChartSvg(pp, pi)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    React.createElement(ReportDocument, {
      candidateName,
      generatedAt: report.generatedAt,
      sections,
      pc, pp, pi,
      maskIndex: report.maskIndex,
      consistencyIndex: report.consistencyIndex,
      consistencyLevel: report.consistencyLevel as 'HIGH' | 'MODERATE' | 'LOW',
      barChartSvg,
      radarChartSvg,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  )

  const safeName = candidateName.replace(/\s+/g, '_')
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="informe_${safeName}.pdf"`,
    },
  })
}
