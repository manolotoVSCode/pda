'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

type IdealValues = { D: number; I: number; S: number; C: number }
const DIM_LABELS = { D: 'Iniciativa', I: 'Vínculo', S: 'Cadencia', C: 'Precisión' } as const
type Dim = keyof IdealValues

const DEFAULT: IdealValues = { D: 50, I: 50, S: 50, C: 50 }
const isNew = (id: string) => id === 'new'

export default function PositionFormPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const creating = isNew(id)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ideal, setIdeal] = useState<IdealValues>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!creating) {
      fetch(`/api/positions/${id}`)
        .then(r => r.json())
        .then(p => {
          setName(p.name)
          setDescription(p.description ?? '')
          setIdeal({ D: p.idealD, I: p.idealI, S: p.idealS, C: p.idealC })
        })
    }
  }, [id, creating])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const body = { name, description, idealD: ideal.D, idealI: ideal.I, idealS: ideal.S, idealC: ideal.C }
    const res = creating
      ? await fetch('/api/positions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch(`/api/positions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    if (res.ok) {
      router.push('/positions')
    } else {
      const d = await res.json()
      setError(d.error ?? 'Error al guardar')
    }
    setSaving(false)
  }

  return (
    <main className="p-8 max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">
        {creating ? 'Nuevo cargo' : 'Editar cargo'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del cargo</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción (opcional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">Perfil ideal (0–100 por dimensión)</p>
          {(['D', 'I', 'S', 'C'] as Dim[]).map(dim => (
            <div key={dim} className="mb-4">
              <div className="flex justify-between text-sm text-slate-700 mb-1">
                <span>{DIM_LABELS[dim]}</span>
                <span className="font-semibold">{ideal[dim]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={ideal[dim]}
                onChange={e => setIdeal(v => ({ ...v, [dim]: Number(e.target.value) }))}
                className="w-full accent-slate-700"
              />
            </div>
          ))}
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-slate-800 px-5 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/positions')}
            className="rounded border border-slate-300 px-5 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </main>
  )
}
