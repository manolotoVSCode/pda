import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { db } from '@/lib/db'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weight, active } = await req.json()
  const term = await db.lexiconTerm.update({
    where: { id: params.id },
    data: {
      ...(weight !== undefined && { weight: Number(weight) }),
      ...(active !== undefined && { active: Boolean(active) }),
    },
  })
  return NextResponse.json(term)
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.lexiconTerm.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
