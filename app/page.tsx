import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, type SessionData } from '@/lib/session'

export default async function RootPage() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (session.isAdmin) redirect('/dashboard')
  redirect('/login')
}
