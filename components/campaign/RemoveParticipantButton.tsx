'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props { campaignId: string; userId: string }

export function RemoveParticipantButton({ campaignId, userId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRemove() {
    setLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId}/participants`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Erro ao remover participante'); return }
    router.refresh()
  }

  return (
    <Button size="sm" variant="ghost" className="text-destructive" disabled={loading} onClick={handleRemove}>
      {loading ? '...' : 'Remover'}
    </Button>
  )
}
