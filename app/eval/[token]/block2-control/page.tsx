'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CONTROL_WORDS } from '@/lib/instrument/words'

interface Props { params: { token: string } }

export default function Block2ControlPage({ params }: Props) {
  const [index, setIndex] = useState(0)
  const [decisions, setDecisions] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const current = CONTROL_WORDS[index]
  const total = CONTROL_WORDS.length

  async function decide(selected: boolean) {
    const next = { ...decisions, [current.key]: selected }
    if (index < total - 1) {
      setDecisions(next)
      setIndex(index + 1)
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/assessments/${params.token}/block2-control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decisions: Object.entries(next).map(([wordKey, sel]) => ({ wordKey, selected: sel })),
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Error al guardar. Intenta nuevamente.')
      setSubmitting(false)
      return
    }
    router.push(`/eval/${params.token}/block3`)
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Parte 2 de 3 — verificación</span>
          <span>{index + 1} / {total}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>
      </div>

      <p className="text-sm text-slate-600 bg-slate-100 rounded-xl p-4 leading-relaxed">
        Para cada palabra, indica si te describe o no. Debes responder antes de continuar.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-3xl font-semibold text-slate-800 mb-2">{current.text}</p>
        <p className="text-sm text-slate-400">¿Esta palabra te describe?</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => decide(false)}
          disabled={submitting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          No me describe
        </button>
        <button
          onClick={() => decide(true)}
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Guardando…' : 'Sí me describe'}
        </button>
      </div>
    </div>
  )
}
