'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Assessment = {
  id: string
  token: string
  status: string
  candidate: { name: string }
  position: { name: string }
  report: { id: string } | null
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/assessments')
      .then(r => r.json())
      .then(setAssessments)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Evaluaciones</h1>
        <Link
          href="/assessments/new"
          className="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          + Nueva evaluación
        </Link>
      </div>
      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : assessments.length === 0 ? (
        <p className="text-slate-500">Sin evaluaciones registradas.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="py-2 pr-4">Candidato</th>
              <th className="py-2 pr-4">Cargo</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4">Informe</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {assessments.map(a => (
              <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 pr-4 font-medium text-slate-800">{a.candidate.name}</td>
                <td className="py-3 pr-4 text-slate-600">{a.position.name}</td>
                <td className="py-3 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    a.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    a.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {a.report ? (
                    <Link href={`/reports/${a.report.id}`} className="text-blue-600 hover:underline text-xs">
                      Ver informe
                    </Link>
                  ) : a.status === 'COMPLETED' ? (
                    <GenerateButton assessmentId={a.id} onGenerated={id => {
                      setAssessments(prev => prev.map(x => x.id === a.id ? { ...x, report: { id } } : x))
                    }} />
                  ) : '—'}
                </td>
                <td className="py-3">
                  <Link href={`/assessments/${a.id}`} className="text-slate-500 hover:underline text-xs">
                    Detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-4">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">← Panel</Link>
      </div>
    </main>
  )
}

function GenerateButton({ assessmentId, onGenerated }: { assessmentId: string; onGenerated: (id: string) => void }) {
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    const res = await fetch(`/api/reports/${assessmentId}`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      onGenerated(data.reportId)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="text-xs text-emerald-700 hover:underline disabled:opacity-50"
    >
      {loading ? 'Generando...' : 'Generar informe'}
    </button>
  )
}
