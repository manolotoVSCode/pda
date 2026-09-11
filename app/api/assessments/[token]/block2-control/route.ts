import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CONTROL_WORDS, WORD_MAP } from '@/lib/instrument/words'
import type { Dimension } from '@prisma/client'

const CONTROL_KEYS = new Set(CONTROL_WORDS.map(w => w.key))

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const body = await req.json()
  const { decisions } = body

  if (
    !Array.isArray(decisions) ||
    decisions.length !== CONTROL_WORDS.length ||
    !decisions.every(
      (d: unknown) =>
        d !== null &&
        typeof d === 'object' &&
        typeof (d as any).wordKey === 'string' &&
        CONTROL_KEYS.has((d as any).wordKey) &&
        typeof (d as any).selected === 'boolean'
    ) ||
    new Set(decisions.map((d: any) => d.wordKey)).size !== CONTROL_WORDS.length
  ) {
    return NextResponse.json(
      { error: 'Decisiones de control inválidas.' },
      { status: 400 }
    )
  }

  const assessment = await db.assessment.findUnique({
    where: { token: params.token },
    select: {
      id: true,
      status: true,
      blockResponses: { where: { block: 2, isControl: false }, select: { id: true } },
    },
  })

  if (!assessment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (assessment.status === 'COMPLETED') return NextResponse.json({ error: 'Completada' }, { status: 409 })
  if (assessment.blockResponses.length < 8) {
    return NextResponse.json({ error: 'Completa la selección principal primero.' }, { status: 409 })
  }

  const selectedDecisions = (decisions as { wordKey: string; selected: boolean }[]).filter(d => d.selected)

  await db.$transaction([
    db.blockResponse.deleteMany({ where: { assessmentId: assessment.id, block: 2, isControl: true } }),
    ...(selectedDecisions.length > 0
      ? [db.blockResponse.createMany({
          data: selectedDecisions.map(d => {
            const word = WORD_MAP.get(d.wordKey)!
            return {
              assessmentId: assessment.id,
              block: 2,
              wordKey: d.wordKey,
              dimension: word.dim as Dimension,
              isControl: true,
            }
          }),
        })]
      : []),
    db.assessment.update({
      where: { id: assessment.id },
      data: { block2ControlCompletedAt: new Date() },
    }),
  ])

  return NextResponse.json({ ok: true })
}
