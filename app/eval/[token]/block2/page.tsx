'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BLOCK2_DISPLAY } from '@/lib/instrument/words'

const LIMIT = 8

interface Props { params: { token: string } }

export default function Block2Page({ params }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else if (next.size < LIMIT) {
        next.add(key)
      }
      return next
    })
  }

  async function handleSubmit() {
    if (selected.size !== LIMIT) return
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/assessments/${params.token}/block2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedKeys: Array.from(selected) }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Error al guardar. Intenta nuevamente.')
      setSubmitting(false)
      return
    }
    router.push(`/eval/${params.token}/block2-control`)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Parte 2 de 3</span>
          <span className={selected.size === LIMIT ? 'text-indigo-600 font-semibold' : ''}>
            {selected.size} / {LIMIT} seleccionadas
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(selected.size / LIMIT) * 100}%` }}
          />
        </div>
      </div>

      <p className="text-sm text-slate-600 bg-slate-100 rounded-xl p-4 leading-relaxed">
        Ahora selecciona exactamente <strong>8</strong> palabras que te describan{' '}
        <strong>tal como eres realmente</strong>, sin considerar cómo te ven los demás.
        Al llegar al límite, el resto se desactiva hasta que quites una marca.
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {BLOCK2_DISPLAY.map(word => {
          const isSelected = selected.has(word.key)
          const isDisabled = !isSelected && selected.size >= LIMIT
          return (
            <button
              key={word.key}
              onClick={() => toggle(word.key)}
              disabled={isDisabled}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-center ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : isDisabled
                  ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'
              }`}
            >
              {word.text}
            </button>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={selected.size !== LIMIT || submitting}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Guardando…' : 'Continuar'}
      </button>
    </div>
  )
}
