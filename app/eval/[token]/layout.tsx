import { db } from '@/lib/db'
import { notFound } from 'next/navigation'

export default async function EvalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { token: string }
}) {
  const assessment = await db.assessment.findUnique({
    where: { token: params.token },
    select: { id: true, status: true },
  })

  if (!assessment) notFound()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  )
}
