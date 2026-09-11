import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const assessment = await db.assessment.findUnique({
    where: { token: params.token },
  })

  if (!assessment) {
    return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
  }

  if (assessment.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Evaluación ya completada' }, { status: 409 })
  }

  if (assessment.status === 'PENDING') {
    await db.assessment.update({
      where: { token: params.token },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    })
  }

  return NextResponse.json({ ok: true })
}
