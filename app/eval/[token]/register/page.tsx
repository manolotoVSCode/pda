'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'

export default function RegisterPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    lastName: '',
    email: '',
    emailConfirm: '',
    gender: '',
    birthDate: '',
    consentPrivacy: false,
    consentComms: false,
  })

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch(`/api/assessments/${params.token}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.status === 201) {
      router.push(`/eval/${params.token}/block1`)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Error al registrar. Intenta nuevamente.')
    }
    setSaving(false)
  }

  const inputClass = 'w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo-ackermann.png"
            alt="Ackermann International"
            width={160}
            height={48}
            priority
          />
        </div>
        <h1 className="text-xl font-semibold text-slate-800 mb-2">Antes de comenzar</h1>
        <p className="text-sm text-slate-500 mb-6">
          Por favor completa tus datos para continuar con la evaluación.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={inputClass}
                placeholder="María"
              />
            </div>
            <div>
              <label className={labelClass}>Apellido <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
                className={inputClass}
                placeholder="González"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Correo electrónico <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className={inputClass}
              placeholder="maria@ejemplo.com"
            />
          </div>

          <div>
            <label className={labelClass}>Confirmar correo <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              value={form.emailConfirm}
              onChange={e => set('emailConfirm', e.target.value)}
              className={inputClass}
              placeholder="maria@ejemplo.com"
            />
          </div>

          <div>
            <label className={labelClass}>Género</label>
            <select
              value={form.gender}
              onChange={e => set('gender', e.target.value)}
              className={inputClass}
            >
              <option value="">Prefiero no indicar</option>
              <option value="Hombre">Hombre</option>
              <option value="Mujer">Mujer</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Fecha de nacimiento</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={e => set('birthDate', e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={form.consentPrivacy}
                onChange={e => set('consentPrivacy', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">
                Acepto las políticas de privacidad y los términos de uso. <span className="text-red-500">*</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consentComms}
                onChange={e => set('consentComms', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-600">
                Autorizo recibir comunicaciones relacionadas con esta evaluación.
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded bg-slate-800 px-4 py-2.5 text-sm text-white font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? 'Registrando...' : 'Comenzar evaluación'}
          </button>
        </form>
      </div>
    </main>
  )
}
