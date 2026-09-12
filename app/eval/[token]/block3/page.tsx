'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props { params: { token: string } }

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function Block3Page({ params }: Props) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const wordCount = countWords(text)
  const tooFew = wordCount < 60
  const tooMany = wordCount > 120
  const valid = wordCount >= 60 && wordCount <= 120

  async function handleSubmit() {
    if (!valid || submitting) return
    setSubmitting(true)
    setError('')
    const res = await fetch(`/api/assessments/${params.token}/block3`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (res.ok) {
      router.push(`/eval/${params.token}/done`)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Error al guardar')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Parte 3 de 3</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5">
          <div className="bg-indigo-500 h-1.5 rounded-full w-full" />
        </div>
      </div>

      <p className="text-sm text-slate-600 bg-slate-100 rounded-xl p-4 leading-relaxed">
        Describe brevemente cómo eres en cuanto a tu manera de relacionarte y trabajar.
        Escribe <strong>entre 60 y 120 palabras</strong>, en primera persona y con naturalidad.
      </p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={6}
        placeholder="Soy una persona que…"
        className="w-full px-4 py-3 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700"
      />

      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${
          tooMany ? 'text-rose-500' : tooFew ? 'text-slate-400' : 'text-emerald-600'
        }`}>
          {wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}
          {tooFew && wordCount > 0 && ` — mínimo 60`}
          {tooMany && ` — máximo 120`}
        </span>

        <button
          onClick={handleSubmit}
          disabled={!valid || submitting}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Guardando…' : 'Finalizar'}
        </button>
      </div>

      {error && <p className="text-rose-600 text-sm">{error}</p>}
    </div>
  )
}
