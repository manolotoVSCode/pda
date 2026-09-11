import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Dimension } from '@prisma/client'

const VALID_DIMS: Dimension[] = ['D', 'I', 'S', 'C']
const VALID_GROUPS = new Set([1, 2, 3, 4, 5, 6, 7])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const body = await req.json()
  const { groupNumber, mostDim, leastDim, isControl } = body

  if (
    !VALID_GROUPS.has(groupNumber) ||
    !VALID_DIMS.includes(mostDim) || !VALID_DIMS.includes(leastDim) ||
    mostDim === leastDim ||
    typeof isControl !== 'boolean' ||
    (isControl && groupNumber !== 7) ||
    (!isControl && groupNumber === 7)
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
        block: 2,
        groupNumber,
      },
    },
    update: { mostDim, leastDim, isControl },
    create: {
      assessmentId: assessment.id,
      block: 2,
      groupNumber,
      isControl,
      mostDim,
      leastDim,
    },
  })

  return NextResponse.json({ ok: true })
}
