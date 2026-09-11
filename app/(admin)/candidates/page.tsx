'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Candidate = {
  id: string
  name: string
  email: string | null
  _count: { assessments: number }
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/candidates')
      .then(r => r.json())
      .then(setCandidates)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Candidatos</h1>
        <Link
          href="/candidates/new"
          className="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          + Nuevo candidato
        </Link>
      </div>
      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : candidates.length === 0 ? (
        <p className="text-slate-500">Sin candidatos registrados.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="py-2 pr-4">Nombre</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Evaluaciones</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map(c => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 pr-4 font-medium text-slate-800">{c.name}</td>
                <td className="py-3 pr-4 text-slate-600">{c.email ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-600">{c._count.assessments}</td>
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
