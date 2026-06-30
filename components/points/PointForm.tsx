'use client'
import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { pointSchema, type PointInput } from '@/schemas/point'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  participants: { id: string; name: string; function: string }[]
  campaigns: { id: string; name: string }[]
  rules: { id: string; name: string; points: number; campaign_id: string; applies_to: string }[]
}

export function PointForm({ participants, campaigns, rules }: Props) {
  const router = useRouter()
  const [selectedCampaignName, setSelectedCampaignName] = useState('')
  const [selectedParticipantName, setSelectedParticipantName] = useState('')
  const [selectedParticipantFunction, setSelectedParticipantFunction] = useState('')
  const [selectedRuleName, setSelectedRuleName] = useState('')

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<PointInput>({ resolver: zodResolver(pointSchema) as unknown as Resolver<PointInput>, defaultValues: { event_date: new Date().toISOString().slice(0, 10), origin: 'manual' } })

  const selectedCampaignId = watch('campaign_id')
  const filteredRules = rules.filter(r =>
    r.campaign_id === selectedCampaignId &&
    (!selectedParticipantFunction || r.applies_to === 'all' || r.applies_to === selectedParticipantFunction)
  )

  async function onSubmit(values: PointInput) {
    const res = await fetch('/api/points/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
    })
    if (!res.ok) { toast.error('Erro ao lançar ponto'); return }
    toast.success('Ponto lançado com sucesso!')
    reset({ event_date: new Date().toISOString().slice(0, 10), origin: 'manual' })
    setSelectedCampaignName('')
    setSelectedParticipantName('')
    setSelectedRuleName('')
    router.refresh()
  }

  const labelStyle = { fontSize: '0.8rem', fontWeight: 500, color: '#3F3E3E', fontFamily: 'var(--font-outfit, sans-serif)', display: 'block', marginBottom: '0.35rem' }
  const triggerStyle = { width: '100%', border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#3F3E3E', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      <div>
        <label style={labelStyle}>Campanha</label>
        <Select onValueChange={v => {
          setValue('campaign_id', v as string)
          setSelectedCampaignName(campaigns.find(c => c.id === v)?.name ?? '')
          setValue('scoring_rule_id', null)
          setSelectedRuleName('')
        }}>
          <SelectTrigger style={triggerStyle}>
            <span style={{ color: selectedCampaignName ? '#3F3E3E' : 'rgba(63,62,62,0.4)' }}>
              {selectedCampaignName || 'Selecione a campanha'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label style={labelStyle}>Participante</label>
        <Select onValueChange={v => {
          const p = participants.find(p => p.id === v)
          setValue('user_id', v as string)
          setSelectedParticipantName(p?.name ?? '')
          setSelectedParticipantFunction(p?.function ?? '')
          setValue('scoring_rule_id', null)
          setSelectedRuleName('')
        }}>
          <SelectTrigger style={triggerStyle}>
            <span style={{ color: selectedParticipantName ? '#3F3E3E' : 'rgba(63,62,62,0.4)' }}>
              {selectedParticipantName || 'Selecione o participante'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {participants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label style={labelStyle}>Critério <span style={{ color: 'rgba(63,62,62,0.4)', fontWeight: 400 }}>(opcional — ou insira os pontos manualmente)</span></label>
        <Select onValueChange={v => {
          setValue('scoring_rule_id', v as string)
          const rule = rules.find(r => r.id === v)
          if (rule) {
            setValue('points', rule.points)
            setSelectedRuleName(`${rule.name} (${rule.points > 0 ? '+' : ''}${rule.points} pts)`)
          }
        }}>
          <SelectTrigger style={triggerStyle} disabled={!selectedCampaignId || !watch('user_id')}>
            <span style={{ color: selectedRuleName ? '#3F3E3E' : 'rgba(63,62,62,0.4)' }}>
              {!selectedCampaignId ? 'Selecione a campanha primeiro' : !watch('user_id') ? 'Selecione o participante primeiro' : selectedRuleName || 'Selecione o critério'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {filteredRules.map(r => (
              <SelectItem key={r.id} value={r.id}>{r.name} ({r.points > 0 ? '+' : ''}{r.points} pts)</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Pontos</label>
          <Input type="number" {...register('points', { valueAsNumber: true })}
            style={{ border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem' }} />
          {errors.points && <p style={{ fontSize: '0.75rem', color: '#c0622a', marginTop: '0.25rem' }}>{errors.points.message}</p>}
        </div>
        <div>
          <label style={labelStyle}>Data do evento</label>
          <Input type="date" {...register('event_date')}
            style={{ border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem' }} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Observação</label>
        <Textarea {...register('description')} rows={2} placeholder="Detalhe opcional..."
          style={{ border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', resize: 'vertical' }} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="sc-btn-primary w-full cursor-pointer"
        style={{ width: '100%', padding: '0.65rem', fontSize: '0.9rem', opacity: isSubmitting ? 0.7 : 1 }}
      >
        {isSubmitting ? 'Lançando...' : 'Lançar ponto'}
      </button>
    </form>
  )
}
