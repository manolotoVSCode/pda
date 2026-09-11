import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MAIN_KEYS, WORD_MAP } from '@/lib/instrument/words'
import type { Dimension } from '@prisma/client'

const BLOCK2_LIMIT = 8

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const body = await req.json()
  const { selectedKeys } = body

  if (
    !Array.isArray(selectedKeys) ||
    selectedKeys.length !== BLOCK2_LIMIT ||
    !selectedKeys.every((k: unknown) => typeof k === 'string' && MAIN_KEYS.has(k as string)) ||
    new Set(selectedKeys).size !== selectedKeys.length
  ) {
    return NextResponse.json(
      { error: `Debes seleccionar exactamente ${BLOCK2_LIMIT} palabras válidas sin repetir.` },
      { status: 400 }
    )
  }

  const assessment = await db.assessment.findUnique({
    where: { token: params.token },
    select: { id: true, status: true },
  })

  if (!assessment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (assessment.status === 'COMPLETED') return NextResponse.json({ error: 'Completada' }, { status: 409 })

  await db.$transaction([
    db.blockResponse.deleteMany({ where: { assessmentId: assessment.id, block: 2, isControl: false } }),
    db.blockResponse.createMany({
      data: (selectedKeys as string[]).map(key => {
        const word = WORD_MAP.get(key)!
        return {
          assessmentId: assessment.id,
          block: 2,
          wordKey: key,
          dimension: word.dim as Dimension,
          isControl: word.isControl,
        }
      }),
    }),
  ])

  return NextResponse.json({ ok: true })
}
