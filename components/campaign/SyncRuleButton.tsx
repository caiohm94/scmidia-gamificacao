'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

export function SyncRuleButton({ ruleId, ruleName }: { ruleId: string; ruleName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSync() {
    setLoading(true)
    const res = await fetch('/api/integrations/salesforce/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_id: ruleId }),
    })
    const json = await res.json() as { results: Array<{ inserted: number; skipped: number; errors: string[] }> }
    setLoading(false)
    const r = json.results?.[0]
    if (!r) { toast.error('Erro no sync'); return }
    if (r.errors.length > 0) {
      toast.error(`Sync com erros: ${r.errors[0]}`)
    } else {
      toast.success(`${r.inserted} transação(ões) inserida(s) — ${r.skipped} sem delta`)
    }
    router.refresh()
  }

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      title={`Sincronizar "${ruleName}" agora`}
      style={{
        background: 'none',
        border: '1px solid rgba(141,178,60,0.3)',
        borderRadius: '0 0.3rem 0.3rem 0.3rem',
        padding: '0.2rem 0.5rem',
        cursor: loading ? 'wait' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize: '0.72rem',
        color: '#5C7435',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <RefreshCw size={11} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
      {loading ? 'Sync...' : 'Sync SF'}
    </button>
  )
}
