'use client'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { pointSchema, type PointInput } from '@/schemas/point'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  participants: { id: string; name: string }[]
  campaigns: { id: string; name: string }[]
  rules: { id: string; name: string; points: number; campaign_id: string }[]
}

export function PointForm({ participants, campaigns, rules }: Props) {
  const router = useRouter()
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<PointInput>({ resolver: zodResolver(pointSchema) as unknown as Resolver<PointInput>, defaultValues: { event_date: new Date().toISOString().slice(0, 10), origin: 'manual' } })

  const selectedCampaign = watch('campaign_id')
  const filteredRules = rules.filter(r => r.campaign_id === selectedCampaign)

  async function onSubmit(values: PointInput) {
    const res = await fetch('/api/points/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values)
    })
    if (!res.ok) { toast.error('Erro ao lançar ponto'); return }
    toast.success('Ponto lançado com sucesso!')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label>Campanha</Label>
        <Select onValueChange={v => setValue('campaign_id', v as string)}>
          <SelectTrigger><SelectValue placeholder="Selecione a campanha" /></SelectTrigger>
          <SelectContent>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Participante</Label>
        <Select onValueChange={v => setValue('user_id', v as string)}>
          <SelectTrigger><SelectValue placeholder="Selecione o participante" /></SelectTrigger>
          <SelectContent>{participants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Critério</Label>
        <Select onValueChange={v => {
          setValue('scoring_rule_id', v as string)
          const rule = rules.find(r => r.id === (v as string))
          if (rule) setValue('points', rule.points)
        }}>
          <SelectTrigger><SelectValue placeholder="Selecione o critério" /></SelectTrigger>
          <SelectContent>{filteredRules.map(r => <SelectItem key={r.id} value={r.id}>{r.name} ({r.points > 0 ? '+' : ''}{r.points} pts)</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Pontos</Label>
          <Input type="number" {...register('points', { valueAsNumber: true })} />
          {errors.points && <p className="text-xs text-red-500">{errors.points.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Data do evento</Label>
          <Input type="date" {...register('event_date')} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Observação</Label>
        <Textarea {...register('description')} rows={2} placeholder="Detalhe opcional..." />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Lançando...' : 'Lançar ponto'}
      </Button>
    </form>
  )
}
