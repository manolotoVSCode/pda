'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AdjectiveCard } from '@/components/adjective-card'
import { MAIN_GROUPS } from '@/lib/adjectives'

interface Props { params: { token: string } }

export default function Block1Page({ params }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [started, setStarted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (started) return
    setStarted(true)
    fetch(`/api/assessments/${params.token}/start`, { method: 'POST' })
  }, [params.token, started])

  const handleComplete = useCallback(async (most: string, least: string) => {
    if (saving) return
    setSaving(true)
    const group = MAIN_GROUPS[currentIdx]
    await fetch(`/api/assessments/${params.token}/block1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupNumber: group.groupNumber,
        mostDim: most,
        leastDim: least,
      }),
    })
    if (currentIdx < MAIN_GROUPS.length - 1) {
      setCurrentIdx(i => i + 1)
      setSaving(false)
    } else {
      router.push(`/eval/${params.token}/block2`)
    }
  }, [saving, currentIdx, params.token, router])

  const group = MAIN_GROUPS[currentIdx]
  const progress = Math.round((currentIdx / MAIN_GROUPS.length) * 100)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Parte 1 de 3</span>
          <span>{currentIdx} de {MAIN_GROUPS.length}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {currentIdx === 0 && (
        <p className="text-sm text-slate-600 bg-slate-100 rounded-xl p-4 leading-relaxed">
          Verás grupos de cuatro palabras. Para cada grupo, selecciona primero la que{' '}
          <strong>mejor te describe</strong> según cómo crees que los demás te perciben.
          Luego, selecciona la que <strong>menos te describe</strong> desde esa perspectiva.
        </p>
      )}

      <AdjectiveCard
        key={`b1-${currentIdx}`}
        adjectives={group.adjectives}
        onComplete={handleComplete}
        disabled={saving}
      />
    </div>
  )
}
