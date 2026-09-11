import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { text } = await req.json()

  if (typeof text !== 'string') {
    return NextResponse.json({ error: 'Texto inválido' }, { status: 400 })
  }

  const wordCount = countWords(text)
  if (wordCount < 40 || wordCount > 80) {
    return NextResponse.json(
      { error: `El texto debe tener entre 40 y 80 palabras. Tiene ${wordCount}.` },
      { status: 400 }
    )
  }

  const assessment = await db.assessment.findUnique({
    where: { token: params.token },
    select: { id: true, status: true, startedAt: true },
  })

  if (!assessment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (assessment.status === 'COMPLETED') return NextResponse.json({ error: 'Completada' }, { status: 409 })

  const completedAt = new Date()
  const durationSeconds = assessment.startedAt
    ? Math.round((completedAt.getTime() - assessment.startedAt.getTime()) / 1000)
    : null

  await db.assessment.update({
    where: { token: params.token },
    data: {
      block3Text: text,
      status: 'COMPLETED',
      completedAt,
      durationSeconds,
    },
  })

  return NextResponse.json({ ok: true })
}
