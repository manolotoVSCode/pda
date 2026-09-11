import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, type SessionData } from '@/lib/session'
import { verifyAdminPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const valid = await verifyAdminPassword(password)
  if (!valid) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  session.isAdmin = true
  await session.save()
  return res
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  session.destroy()
  return res
}
