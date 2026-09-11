import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const terms = await db.lexiconTerm.findMany({ orderBy: [{ dimension: 'asc' }, { weight: 'desc' }, { term: 'asc' }] })
  return NextResponse.json(terms)
}

export async function POST(req: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dimension, term, weight } = await req.json()
  if (!dimension || !term || weight === undefined) {
    return NextResponse.json({ error: 'dimension, term, weight required' }, { status: 400 })
  }

  const entry = await db.lexiconTerm.create({
    data: { dimension, term: term.toLowerCase(), weight: Number(weight) },
  })
  return NextResponse.json(entry, { status: 201 })
}
