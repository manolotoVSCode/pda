import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MAIN_KEYS, WORD_MAP } from '@/lib/instrument/words'
import type { Dimension } from '@prisma/client'

const BLOCK1_LIMIT = 8

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const body = await req.json()
  const { selectedKeys } = body

  if (
    !Array.isArray(selectedKeys) ||
    selectedKeys.length !== BLOCK1_LIMIT ||
    !selectedKeys.every((k: unknown) => typeof k === 'string' && MAIN_KEYS.has(k as string)) ||
    new Set(selectedKeys).size !== selectedKeys.length
  ) {
    return NextResponse.json(
      { error: `Debes seleccionar exactamente ${BLOCK1_LIMIT} palabras válidas sin repetir.` },
      { status: 400 }
    )
  }

  const assessment = await db.assessment.findUnique({
    where: { token: params.token },
    select: { id: true, status: true, startedAt: true },
  })

  if (!assessment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (assessment.status === 'COMPLETED') return NextResponse.json({ error: 'Completada' }, { status: 409 })

  await db.$transaction([
    // Mark the assessment as started on first block1 submission
    db.assessment.update({
      where: { id: assessment.id },
      data: {
        ...(assessment.startedAt == null ? { startedAt: new Date(), status: 'IN_PROGRESS' } : {}),
      },
    }),
    db.blockResponse.deleteMany({ where: { assessmentId: assessment.id, block: 1 } }),
    db.blockResponse.createMany({
      data: (selectedKeys as string[]).map(key => {
        const word = WORD_MAP.get(key)!
        return {
          assessmentId: assessment.id,
          block: 1,
          wordKey: key,
          dimension: word.dim as Dimension,
          isControl: false,
        }
      }),
    }),
  ])

  return NextResponse.json({ ok: true })
}
