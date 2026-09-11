import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, type SessionData } from '@/lib/session'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) redirect('/login')
  return <div className="min-h-screen bg-slate-50">{children}</div>
}
