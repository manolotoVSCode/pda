'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Template = {
  id: string
  section: string
  dimension: string | null
  subtype: string | null
  questionIndex: number | null
  riskLevel: string | null
  intensity: string | null
  content: string
}

const SECTION_LABELS: Record<string, string> = {
  INTENSITY: 'Modificador de intensidad',
  PROFILE_DESCRIPTION: 'Descripción del Perfil',
  ALERTS: 'Señales de alerta',
  INTERVIEW_QUESTIONS: 'Preguntas de entrevista',
  PROJECTION: 'Proyección de desempeño',
  POTENTIAL: 'Potencial y recomendaciones',
  GAP_ANALYSIS: 'Análisis de rasgos dominantes',
}

const DIM_LABELS: Record<string, string> = {
  D: 'Iniciativa', I: 'Vínculo', S: 'Cadencia', C: 'Precisión',
}

function rowLabel(t: Template): string {
  const parts: string[] = []
  if (t.dimension) parts.push(DIM_LABELS[t.dimension] ?? t.dimension)
  if (t.subtype) parts.push(t.subtype === 'excess' ? 'Exceso' : 'Déficit')
  if (t.questionIndex) parts.push(`P${t.questionIndex}`)
  if (t.riskLevel) parts.push(t.riskLevel === 'LOW' ? 'Bajo' : t.riskLevel === 'MEDIUM' ? 'Moderado' : 'Alto')
  if (t.intensity) parts.push(t.intensity === 'HIGH' ? 'Alta' : t.intensity === 'MEDIUM' ? 'Media' : 'Baja')
  return parts.join(' · ') || '—'
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(setTemplates)
      .finally(() => setLoading(false))
  }, [])

  async function save(id: string) {
    setSaving(true)
    await fetch(`/api/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editValue }),
    })
    setTemplates(t => t.map(x => x.id === id ? { ...x, content: editValue } : x))
    setEditing(null)
    setSaving(false)
  }

  const grouped = Object.keys(SECTION_LABELS).map(section => ({
    section,
    label: SECTION_LABELS[section],
    rows: templates.filter(t => t.section === section),
  }))

  return (
    <main className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Plantillas Narrativas</h1>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">← Panel</Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ section, label, rows }) => (
            <div key={section}>
              <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">{label}</h2>
              <div className="space-y-3">
                {rows.map(t => (
                  <div key={t.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs text-slate-500 font-medium mb-2">{rowLabel(t)}</p>
                      {editing !== t.id && (
                        <button
                          onClick={() => { setEditing(t.id); setEditValue(t.content) }}
                          className="text-xs text-blue-600 hover:underline flex-shrink-0"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                    {editing === t.id ? (
                      <div>
                        <textarea
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          rows={4}
                          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => save(t.id)}
                            disabled={saving}
                            className="rounded bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
                          >
                            {saving ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">{t.content}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
