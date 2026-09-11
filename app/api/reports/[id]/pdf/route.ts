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
          position: true,
        },
      },
    },
  })

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const pc = { D: report.pcD, I: report.pcI, S: report.pcS, C: report.pcC }
  const pp = { D: report.ppD, I: report.ppI, S: report.ppS, C: report.ppC }
  const pi = { D: report.piD, I: report.piI, S: report.piS, C: report.piC }
  const ideal = {
    D: report.assessment.position.idealD,
    I: report.assessment.position.idealI,
    S: report.assessment.position.idealS,
    C: report.assessment.position.idealC,
  }

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

  const interviewQuestions = selectInterviewQuestions(rows, pc, ideal)

  const sections = buildReportSections(
    rows,
    pc,
    ideal,
    report.fitScore,
    report.maskIndex,
    report.consistencyLevel as 'HIGH' | 'MODERATE' | 'LOW',
    report.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH',
    interviewQuestions,
    report.assessment.candidate.name,
  )

  const barChartSvg = buildBarChartSvg(pc)
  const radarChartSvg = buildRadarChartSvg(pc, ideal)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    React.createElement(ReportDocument, {
      candidateName: report.assessment.candidate.name,
      positionName: report.assessment.position.name,
      generatedAt: report.generatedAt,
      sections,
      pc, pp, pi,
      maskIndex: report.maskIndex,
      consistencyIndex: report.consistencyIndex,
      consistencyLevel: report.consistencyLevel as 'HIGH' | 'MODERATE' | 'LOW',
      fitScore: report.fitScore,
      projectionScore: report.projectionScore,
      riskLevel: report.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH',
      barChartSvg,
      radarChartSvg,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  )

  const candidateName = report.assessment.candidate.name.replace(/\s+/g, '_')
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="informe_${candidateName}.pdf"`,
    },
  })
}
