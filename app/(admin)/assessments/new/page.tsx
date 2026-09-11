'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewAssessmentPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/assessments', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      router.push(`/assessments/${data.id}`)
    } else {
      setError('Error al crear la evaluación')
    }
    setSaving(false)
  }

  return (
    <main className="p-8 max-w-md">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Nueva evaluación</h1>
      <p className="text-sm text-slate-500 mb-8">
        Se generará un enlace único. La persona evaluada completará sus datos al abrirlo.
      </p>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleCreate}
          disabled={saving}
          className="rounded bg-slate-800 px-5 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? 'Creando...' : 'Generar evaluación'}
        </button>
        <button
          onClick={() => router.push('/assessments')}
          className="rounded border border-slate-300 px-5 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </main>
  )
}
