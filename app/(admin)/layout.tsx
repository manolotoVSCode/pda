import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, type SessionData } from '@/lib/session'
import Image from 'next/image'
import { LogoutButton } from './LogoutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) redirect('/login')
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <Image
          src="/logo-ackermann.png"
          alt="Ackermann International"
          width={160}
          height={48}
          priority
        />
        <LogoutButton />
      </header>
      {children}
    </div>
  )
}
