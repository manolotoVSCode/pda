'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Term = {
  id: string
  dimension: string
  term: string
  weight: number
  active: boolean
}

const DIM_LABELS: Record<string, string> = {
  D: 'Iniciativa', I: 'Vínculo', S: 'Cadencia', C: 'Precisión',
}

export default function LexiconPage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [newTerm, setNewTerm] = useState({ dimension: 'D', term: '', weight: 1 })
  const [adding, setAdding] = useState(false)

  async function load() {
    setLoading(true)
    const data = await fetch('/api/lexicon').then(r => r.json())
    setTerms(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/lexicon/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    setTerms(t => t.map(x => x.id === id ? { ...x, active } : x))
  }

  async function updateWeight(id: string, weight: number) {
    await fetch(`/api/lexicon/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight }),
    })
    setTerms(t => t.map(x => x.id === id ? { ...x, weight } : x))
  }

  async function addTerm(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const res = await fetch('/api/lexicon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTerm),
    })
    if (res.ok) {
      setNewTerm({ dimension: 'D', term: '', weight: 1 })
      await load()
    }
    setAdding(false)
  }

  const byDim = ['D', 'I', 'S', 'C'].map(dim => ({
    dim,
    label: DIM_LABELS[dim],
    terms: terms.filter(t => t.dimension === dim),
    denominator: terms.filter(t => t.dimension === dim && t.active).reduce((s, t) => s + t.weight, 0),
  }))

  return (
    <main className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Diccionario Léxico</h1>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">← Panel</Link>
      </div>

      {/* Add term */}
      <form onSubmit={addTerm} className="flex gap-3 mb-8 items-end flex-wrap">
        <div>
          <label className="block text-xs text-slate-600 mb-1">Dimensión</label>
          <select
            value={newTerm.dimension}
            onChange={e => setNewTerm(t => ({ ...t, dimension: e.target.value }))}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm"
          >
            {['D', 'I', 'S', 'C'].map(d => <option key={d} value={d}>{DIM_LABELS[d]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Término (forma canónica)</label>
          <input
            value={newTerm.term}
            onChange={e => setNewTerm(t => ({ ...t, term: e.target.value }))}
            required
            placeholder="ej: decidido"
            className="border border-slate-300 rounded px-2 py-1.5 text-sm w-40"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Peso (1–3)</label>
          <select
            value={newTerm.weight}
            onChange={e => setNewTerm(t => ({ ...t, weight: Number(e.target.value) }))}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm"
          >
            {[1, 2, 3].map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="rounded bg-slate-800 px-4 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {adding ? 'Agregando...' : 'Agregar término'}
        </button>
      </form>

      {loading ? <p className="text-slate-500">Cargando...</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {byDim.map(({ dim, label, terms: dimTerms, denominator }) => (
            <div key={dim}>
              <h2 className="font-semibold text-slate-700 mb-1">
                {label} <span className="text-xs text-slate-400 font-normal">denominador activo: {denominator}</span>
              </h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-200">
                    <th className="py-1 text-left pr-2">Término</th>
                    <th className="py-1 text-left pr-2">Peso</th>
                    <th className="py-1 text-left">Activo</th>
                  </tr>
                </thead>
                <tbody>
                  {dimTerms.map(t => (
                    <tr key={t.id} className={`border-b border-slate-100 ${!t.active ? 'opacity-40' : ''}`}>
                      <td className="py-1.5 pr-2 font-mono text-xs">{t.term}</td>
                      <td className="py-1.5 pr-2">
                        <select
                          value={t.weight}
                          onChange={e => updateWeight(t.id, Number(e.target.value))}
                          className="border border-slate-200 rounded px-1 py-0.5 text-xs"
                        >
                          {[1, 2, 3].map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5">
                        <input
                          type="checkbox"
                          checked={t.active}
                          onChange={e => toggleActive(t.id, e.target.checked)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
