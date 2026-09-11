'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Position = {
  id: string
  name: string
  description: string | null
  idealD: number
  idealI: number
  idealS: number
  idealC: number
  _count: { assessments: number }
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/positions')
      .then(r => r.json())
      .then(setPositions)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Cargos</h1>
        <Link
          href="/positions/new"
          className="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          + Nuevo cargo
        </Link>
      </div>
      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : positions.length === 0 ? (
        <p className="text-slate-500">Sin cargos registrados. Crea el primero.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="py-2 pr-4">Cargo</th>
                <th className="py-2 pr-4">Iniciativa</th>
                <th className="py-2 pr-4">Vínculo</th>
                <th className="py-2 pr-4">Cadencia</th>
                <th className="py-2 pr-4">Precisión</th>
                <th className="py-2 pr-4">Evaluaciones</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 pr-4 font-medium text-slate-800">{p.name}</td>
                  <td className="py-3 pr-4 text-slate-600">{p.idealD}</td>
                  <td className="py-3 pr-4 text-slate-600">{p.idealI}</td>
                  <td className="py-3 pr-4 text-slate-600">{p.idealS}</td>
                  <td className="py-3 pr-4 text-slate-600">{p.idealC}</td>
                  <td className="py-3 pr-4 text-slate-600">{p._count.assessments}</td>
                  <td className="py-3">
                    <Link href={`/positions/${p.id}`} className="text-blue-600 hover:underline">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">← Panel</Link>
      </div>
    </main>
  )
}
