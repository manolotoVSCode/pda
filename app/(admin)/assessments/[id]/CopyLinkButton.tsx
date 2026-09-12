'use client'
import { useState } from 'react'

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="mt-2 text-xs text-slate-600 border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-100 transition-colors"
    >
      {copied ? '¡Copiado!' : 'Copiar enlace'}
    </button>
  )
}
