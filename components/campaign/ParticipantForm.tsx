'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface User { id: string; name: string; email: string }
interface Props { campaignId: string }

export function ParticipantForm({ campaignId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleOpen() {
    setOpen(true)
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: [userId] }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Erro ao adicionar participante'); return }
    toast.success('Participante adicionado!')
    setOpen(false)
    setUserId('')
    router.refresh()
  }

  if (!open) return (
    <Button size="sm" variant="outline" onClick={handleOpen}>+ Adicionar participante</Button>
  )

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4 bg-muted/20">
      <div className="space-y-1">
        <Label>Usuário</Label>
        <Select value={userId} onValueChange={v => setUserId(v as string)}>
          <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
          <SelectContent>
            {users.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.name} — {u.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading || !userId}>
          {loading ? 'Adicionando...' : 'Adicionar'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  )
}
