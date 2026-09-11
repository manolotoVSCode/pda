'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AdjectiveCard } from '@/components/adjective-card'
import { BLOCK2_ORDER } from '@/lib/adjectives'

interface Props { params: { token: string } }

export default function Block2Page({ params }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleComplete = useCallback(async (most: string, least: string) => {
    if (saving) return
    setSaving(true)
    const group = BLOCK2_ORDER[currentIdx]
    await fetch(`/api/assessments/${params.token}/block2`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupNumber: group.groupNumber,
        mostDim: most,
        leastDim: least,
        isControl: group.isControl,
      }),
    })
    if (currentIdx < BLOCK2_ORDER.length - 1) {
      setCurrentIdx(i => i + 1)
      setSaving(false)
    } else {
      router.push(`/eval/${params.token}/block3`)
    }
  }, [saving, currentIdx, params.token, router])

  const group = BLOCK2_ORDER[currentIdx]
  const progress = Math.round((currentIdx / BLOCK2_ORDER.length) * 100)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Parte 2 de 3</span>
          <span>{currentIdx} de {BLOCK2_ORDER.length}</span>
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
          Ahora responde pensando en <strong>cómo eres realmente</strong> en tu comportamiento
          natural, sin considerar cómo te ven los demás ni cómo actúas en el trabajo.
        </p>
      )}

      <AdjectiveCard
        key={`b2-${currentIdx}`}
        adjectives={group.adjectives}
        onComplete={handleComplete}
        disabled={saving}
      />
    </div>
  )
}
