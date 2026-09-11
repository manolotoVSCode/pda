import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { db } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assessment = await db.assessment.findUnique({
    where: { token: params.token },
    select: { id: true },
  })
  if (!assessment) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  await db.$transaction([
    db.blockResponse.deleteMany({ where: { assessmentId: assessment.id } }),
    db.report.deleteMany({ where: { assessmentId: assessment.id } }),
    db.assessment.delete({ where: { id: assessment.id } }),
  ])

  return NextResponse.json({ ok: true })
}
