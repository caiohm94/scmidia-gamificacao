'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

export function DeleteTransactionButton({ id }: { id: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/points/${id}`, { method: 'DELETE' })
    setLoading(false)
    if (!res.ok) { toast.error('Erro ao excluir lançamento'); return }
    toast.success('Lançamento excluído')
    setConfirming(false)
    router.refresh()
  }

  if (confirming) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <button
        onClick={handleDelete}
        disabled={loading}
        style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: '#c0622a', color: '#fff', border: 'none', borderRadius: '0 0.3rem 0.3rem 0.3rem', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
      >
        {loading ? '...' : 'Confirmar'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: 'none', color: 'rgba(63,62,62,0.4)', border: '1px solid rgba(63,62,62,0.15)', borderRadius: '0 0.3rem 0.3rem 0.3rem', cursor: 'pointer' }}
      >
        Cancelar
      </button>
    </span>
  )

  return (
    <button
      onClick={() => setConfirming(true)}
      title="Excluir lançamento"
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem 0.3rem', color: 'rgba(63,62,62,0.3)', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#c0622a')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(63,62,62,0.3)')}
    >
      <Trash2 size={13} />
    </button>
  )
}
