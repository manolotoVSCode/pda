import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidates = await db.candidate.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { assessments: true } } },
  })
  return NextResponse.json(candidates)
}

export async function POST(req: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, email } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const candidate = await db.candidate.create({
    data: {
      consultantId: 'default-consultant',
      name,
      email: email || null,
    },
  })
  return NextResponse.json(candidate, { status: 201 })
}
