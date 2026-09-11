import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const positions = await db.position.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { assessments: true } } },
  })
  return NextResponse.json(positions)
}

export async function POST(req: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description, idealD, idealI, idealS, idealC } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const position = await db.position.create({
    data: {
      consultantId: 'default-consultant',
      name,
      description: description ?? null,
      idealD: Number(idealD ?? 50),
      idealI: Number(idealI ?? 50),
      idealS: Number(idealS ?? 50),
      idealC: Number(idealC ?? 50),
    },
  })
  return NextResponse.json(position, { status: 201 })
}
