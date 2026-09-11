'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Candidate = { id: string; name: string }
type Position = { id: string; name: string }

export default function NewAssessmentPage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [candidateId, setCandidateId] = useState('')
  const [positionId, setPositionId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/candidates').then(r => r.json()).then(setCandidates)
    fetch('/api/positions').then(r => r.json()).then(setPositions)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, positionId }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/assessments/${data.id}`)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Error al crear')
    }
    setSaving(false)
  }

  return (
    <main className="p-8 max-w-md">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Nueva evaluación</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Candidato</label>
          <select
            value={candidateId}
            onChange={e => setCandidateId(e.target.value)}
            required
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Seleccionar candidato...</option>
            {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
          <select
            value={positionId}
            onChange={e => setPositionId(e.target.value)}
            required
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Seleccionar cargo...</option>
            {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-slate-800 px-5 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear evaluación'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/assessments')}
            className="rounded border border-slate-300 px-5 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </main>
  )
}
