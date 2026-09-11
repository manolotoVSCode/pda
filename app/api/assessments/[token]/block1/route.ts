import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Dimension } from '@prisma/client'

const VALID_DIMS: Dimension[] = ['D', 'I', 'S', 'C']

export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const body = await req.json()
  const { groupNumber, mostDim, leastDim } = body

  if (
    typeof groupNumber !== 'number' || groupNumber < 1 || groupNumber > 6 ||
    !VALID_DIMS.includes(mostDim) || !VALID_DIMS.includes(leastDim) ||
    mostDim === leastDim
  ) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const assessment = await db.assessment.findUnique({
    where: { token: params.token },
    select: { id: true, status: true },
  })

  if (!assessment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (assessment.status === 'COMPLETED') return NextResponse.json({ error: 'Completada' }, { status: 409 })

  await db.blockResponse.upsert({
    where: {
      assessmentId_block_groupNumber: {
        assessmentId: assessment.id,
        block: 1,
        groupNumber,
      },
    },
    update: { mostDim, leastDim },
    create: {
      assessmentId: assessment.id,
      block: 1,
      groupNumber,
      isControl: false,
      mostDim,
      leastDim,
    },
  })

  return NextResponse.json({ ok: true })
}
