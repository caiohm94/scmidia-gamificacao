'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function RematchButton({ recordId }: { recordId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRematch() {
    setLoading(true)
    const res = await fetch('/api/integrations/salesforce/rematch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_id: recordId }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(json.error ?? 'Erro'); return }
    if (json.matched) {
      toast.success(`Match feito! +${json.points} pts`)
      router.refresh()
    } else {
      toast.warning(json.reason ?? 'Sem match')
    }
  }

  return (
    <button
      onClick={handleRematch}
      disabled={loading}
      title="Tentar fazer match agora"
      style={{
        fontSize: '0.67rem', padding: '0.15rem 0.5rem',
        background: 'rgba(63,62,62,0.07)', color: 'rgba(63,62,62,0.5)',
        border: '1px solid rgba(63,62,62,0.15)',
        borderRadius: '0 0.25rem 0.25rem 0.25rem',
        cursor: loading ? 'default' : 'pointer',
        opacity: loading ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? '...' : '↺ match'}
    </button>
  )
}
