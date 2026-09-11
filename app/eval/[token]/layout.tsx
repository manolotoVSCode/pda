import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Image from 'next/image'

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
      <div className="flex justify-center pt-8 pb-4">
        <Image
          src="/logo-ackermann.png"
          alt="Ackermann"
          width={140}
          height={42}
          priority
        />
      </div>
      <div className="max-w-xl mx-auto px-4 py-4">
        {children}
      </div>
    </div>
  )
}
