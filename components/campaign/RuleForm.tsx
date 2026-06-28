'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Props { campaignId: string }

export function RuleForm({ campaignId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    points: '',
    category: 'goal',
    applies_to: 'all',
    target_value: '',
    target_period: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const body = {
      name: form.name,
      description: form.description || undefined,
      points: parseInt(form.points),
      category: form.category,
      applies_to: form.applies_to,
      target_value: form.target_value ? parseInt(form.target_value) : undefined,
      target_period: form.target_period || undefined,
    }
    const res = await fetch(`/api/campaigns/${campaignId}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Erro ao salvar regra'); return }
    toast.success('Regra criada!')
    setOpen(false)
    setForm({ name: '', description: '', points: '', category: 'goal', applies_to: 'all', target_value: '', target_period: '' })
    router.refresh()
  }

  if (!open) return (
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}>+ Nova regra</Button>
  )

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4 bg-muted/20">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1 col-span-2">
          <Label>Nome da regra *</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Venda de pacote Premium" required />
        </div>
        <div className="space-y-1">
          <Label>Pontos *</Label>
          <Input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} placeholder="100" required />
        </div>
        <div className="space-y-1">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as string }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="goal">Meta</SelectItem>
              <SelectItem value="activity">Atividade</SelectItem>
              <SelectItem value="behavior">Comportamento</SelectItem>
              <SelectItem value="bonus">Bônus</SelectItem>
              <SelectItem value="penalty">Penalidade</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Aplica-se a</Label>
          <Select value={form.applies_to} onValueChange={v => setForm(f => ({ ...f, applies_to: v as string }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="internal_seller">Vendedor Interno</SelectItem>
              <SelectItem value="external_seller">Vendedor Externo</SelectItem>
              <SelectItem value="hunter">Hunter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Período</Label>
          <Select value={form.target_period} onValueChange={v => setForm(f => ({ ...f, target_period: v as string }))}>
            <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Descrição</Label>
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Detalhes da regra..." />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>{loading ? 'Salvando...' : 'Salvar regra'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  )
}
