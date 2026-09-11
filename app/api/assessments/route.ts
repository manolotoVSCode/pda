import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assessments = await db.assessment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      candidate: { select: { name: true, lastName: true } },
      position: { select: { name: true } },
      report: { select: { id: true } },
    },
  })
  return NextResponse.json(assessments)
}

export async function POST() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assessment = await db.assessment.create({
    data: { consultantId: 'default-consultant' },
  })
  return NextResponse.json(assessment, { status: 201 })
}
