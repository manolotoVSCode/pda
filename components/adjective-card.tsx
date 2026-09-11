'use client'
import { useState } from 'react'
import type { Adjective } from '@/lib/adjectives'

interface AdjectiveCardProps {
  adjectives: Adjective[]
  onComplete: (most: string, least: string) => void
  disabled?: boolean
}

export function AdjectiveCard({ adjectives, onComplete, disabled = false }: AdjectiveCardProps) {
  const [mostDim, setMostDim] = useState<string | null>(null)

  function handleMostClick(dim: string) {
    if (disabled || mostDim !== null) return
    setMostDim(dim)
  }

  function handleLeastClick(dim: string) {
    if (disabled || mostDim === null) return
    onComplete(mostDim, dim)
  }

  const remaining = adjectives.filter(a => a.dim !== mostDim)

  if (mostDim === null) {
    return (
      <div>
        <p className="text-sm text-slate-500 mb-3 text-center">
          Toca la que <strong>más</strong> te describe
        </p>
        <div className="grid grid-cols-2 gap-3">
          {adjectives.map(adj => (
            <button
              key={adj.dim}
              onClick={() => handleMostClick(adj.dim)}
              className="p-5 text-center rounded-xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 active:scale-95 transition-all text-base font-medium text-slate-700"
            >
              {adj.text}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3 text-center">
        Ahora toca la que <strong>menos</strong> te describe
      </p>
      <div className="grid grid-cols-3 gap-3">
        {remaining.map(adj => (
          <button
            key={adj.dim}
            onClick={() => handleLeastClick(adj.dim)}
            className="p-5 text-center rounded-xl border-2 border-slate-200 hover:border-rose-300 hover:bg-rose-50 active:scale-95 transition-all text-base font-medium text-slate-700"
          >
            {adj.text}
          </button>
        ))}
      </div>
    </div>
  )
}
