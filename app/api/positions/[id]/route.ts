import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const position = await db.position.findUnique({ where: { id: params.id } })
  if (!position) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(position)
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description, idealD, idealI, idealS, idealC } = await req.json()
  const position = await db.position.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(idealD !== undefined && { idealD: Number(idealD) }),
      ...(idealI !== undefined && { idealI: Number(idealI) }),
      ...(idealS !== undefined && { idealS: Number(idealS) }),
      ...(idealC !== undefined && { idealC: Number(idealC) }),
    },
  })
  return NextResponse.json(position)
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.position.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
