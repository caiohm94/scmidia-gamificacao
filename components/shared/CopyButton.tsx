'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      title="Copiar URL"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        fontSize: '0.72rem', fontFamily: 'var(--font-outfit, sans-serif)',
        padding: '0.25rem 0.6rem',
        background: copied ? 'rgba(141,178,60,0.12)' : 'rgba(63,62,62,0.06)',
        color: copied ? '#5C7435' : 'rgba(63,62,62,0.5)',
        border: '1px solid',
        borderColor: copied ? 'rgba(141,178,60,0.3)' : 'rgba(63,62,62,0.15)',
        borderRadius: '0 0.35rem 0.35rem 0.35rem',
        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  )
}
