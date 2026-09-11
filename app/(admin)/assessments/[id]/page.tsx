import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
}

export default async function AssessmentDetailPage({ params }: { params: { id: string } }) {
  const assessment = await db.assessment.findUnique({
    where: { id: params.id },
    include: {
      candidate: true,
      position: true,
      report: { select: { id: true } },
    },
  })

  if (!assessment) notFound()

  const evalUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/eval/${assessment.token}`

  return (
    <main className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/assessments" className="text-sm text-slate-500 hover:underline">← Evaluaciones</Link>
      </div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-1">
        {assessment.candidate.name}
      </h1>
      <p className="text-slate-500 mb-6">Cargo: {assessment.position.name}</p>

      <dl className="space-y-3 text-sm">
        <div className="flex gap-4">
          <dt className="w-32 text-slate-500 font-medium">Estado</dt>
          <dd>
            <span className={`text-xs px-2 py-0.5 rounded ${
              assessment.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
              assessment.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {STATUS_LABELS[assessment.status] ?? assessment.status}
            </span>
          </dd>
        </div>
        {assessment.durationSeconds && (
          <div className="flex gap-4">
            <dt className="w-32 text-slate-500 font-medium">Duración</dt>
            <dd>{Math.round(assessment.durationSeconds / 60)} min {assessment.durationSeconds % 60} seg</dd>
          </div>
        )}
      </dl>

      <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm font-medium text-slate-700 mb-2">URL para el candidato</p>
        <p className="text-sm text-slate-600 break-all font-mono">{evalUrl}</p>
        <p className="text-xs text-slate-400 mt-2">Comparte esta URL con {assessment.candidate.name} para que complete la evaluación.</p>
      </div>

      {assessment.report && (
        <div className="mt-6">
          <Link
            href={`/reports/${assessment.report.id}`}
            className="inline-block rounded bg-slate-800 px-5 py-2 text-sm text-white hover:bg-slate-700"
          >
            Ver informe generado
          </Link>
        </div>
      )}
    </main>
  )
}
