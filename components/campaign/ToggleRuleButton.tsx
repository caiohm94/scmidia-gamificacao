'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props { campaignId: string; ruleId: string; isActive: boolean }

export function ToggleRuleButton({ campaignId, ruleId, isActive }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId}/rules`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_id: ruleId, is_active: !isActive }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Erro ao atualizar regra'); return }
    router.refresh()
  }

  return (
    <Button size="sm" variant="ghost" disabled={loading} onClick={handleToggle}>
      {loading ? '...' : isActive ? 'Desativar' : 'Ativar'}
    </Button>
  )
}
