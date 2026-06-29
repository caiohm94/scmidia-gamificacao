'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const categoryLabels: Record<string, string> = { goal: 'Meta', activity: 'Atividade', behavior: 'Comportamento', bonus: 'Bônus', penalty: 'Penalidade' }
const appliesToLabels: Record<string, string> = { all: 'Todos', internal_seller: 'Vendedor Interno', external_seller: 'Vendedor Externo', hunter: 'Hunter' }
const periodLabels: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' }
const frequencyLabels: Record<string, string> = { '5min': 'A cada 5 minutos', daily: '1x por dia (horário)', weekly: '1x por semana (dia + horário)' }
const dayLabels: Record<string, string> = { '0': 'Domingo', '1': 'Segunda-feira', '2': 'Terça-feira', '3': 'Quarta-feira', '4': 'Quinta-feira', '5': 'Sexta-feira', '6': 'Sábado' }

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
    data_origin: 'manual' as 'manual' | 'salesforce',
    sf_soql: '',
    sf_alias_field: 'Owner.Alias',
    sf_frequency: '' as '5min' | 'daily' | 'weekly' | '',
    sf_run_time: '',
    sf_run_day: '',
    value_type: 'number',
    decimal_places: '0',
  })

  function resetForm() {
    setForm({
      name: '', description: '', points: '', category: 'goal', applies_to: 'all',
      target_value: '', target_period: '',
      data_origin: 'manual', sf_soql: '', sf_alias_field: 'Owner.Alias',
      sf_frequency: '', sf_run_time: '', sf_run_day: '',
      value_type: 'number', decimal_places: '0',
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const isSf = form.data_origin === 'salesforce'
    const body = {
      name: form.name,
      description: form.description || undefined,
      points: parseInt(form.points),
      category: form.category,
      applies_to: form.applies_to,
      target_value: form.target_value ? parseInt(form.target_value) : undefined,
      target_period: form.target_period || undefined,
      data_origin: form.data_origin,
      sf_soql: isSf ? form.sf_soql || undefined : undefined,
      sf_alias_field: isSf ? (form.sf_alias_field || 'Owner.Alias') : undefined,
      sf_frequency: isSf ? form.sf_frequency || undefined : undefined,
      sf_run_time: isSf && form.sf_run_time ? form.sf_run_time : undefined,
      sf_run_day: isSf && form.sf_run_day !== '' ? parseInt(form.sf_run_day) : undefined,
      value_type: form.value_type,
      decimal_places: parseInt(form.decimal_places) || 0,
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
    resetForm()
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
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v ?? '' }))}>
            <SelectTrigger><span>{categoryLabels[form.category]}</span></SelectTrigger>
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
          <Label>Tipo de valor</Label>
          <Select value={form.value_type} onValueChange={v => setForm(f => ({ ...f, value_type: v ?? 'number' }))}>
            <SelectTrigger>
              <span>{{ number: 'Número', currency: 'Monetário (R$)', percentage: 'Percentual (%)' }[form.value_type] ?? 'Número'}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="number">Número</SelectItem>
              <SelectItem value="currency">Monetário (R$)</SelectItem>
              <SelectItem value="percentage">Percentual (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Casas decimais</Label>
          <Input
            type="number"
            min="0"
            max="4"
            value={form.decimal_places}
            onChange={e => setForm(f => ({ ...f, decimal_places: e.target.value }))}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label>Aplica-se a</Label>
          <Select value={form.applies_to} onValueChange={v => setForm(f => ({ ...f, applies_to: v ?? '' }))}>
            <SelectTrigger><span>{appliesToLabels[form.applies_to]}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="internal_seller">Vendedor Interno</SelectItem>
              <SelectItem value="external_seller">Vendedor Externo</SelectItem>
              <SelectItem value="hunter">Hunter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.category === 'goal' && (
          <div className="space-y-1">
            <Label>Período</Label>
            <Select value={form.target_period} onValueChange={v => setForm(f => ({ ...f, target_period: v ?? '' }))}>
              <SelectTrigger><span>{form.target_period ? periodLabels[form.target_period] : 'Opcional'}</span></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Origem dos dados */}
        <div className="space-y-1 col-span-2">
          <Label>Origem dos dados</Label>
          <Select value={form.data_origin} onValueChange={v => setForm(f => ({ ...f, data_origin: (v ?? 'manual') as 'manual' | 'salesforce' }))}>
            <SelectTrigger><span>{form.data_origin === 'salesforce' ? 'Salesforce' : 'Manual'}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="salesforce">Salesforce</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campos Salesforce — aparecem apenas quando origem = salesforce */}
        {form.data_origin === 'salesforce' && (
          <>
            <div className="space-y-1 col-span-2">
              <Label>Query SOQL *</Label>
              <Textarea
                value={form.sf_soql}
                onChange={e => setForm(f => ({ ...f, sf_soql: e.target.value }))}
                rows={4}
                placeholder={`SELECT Id, Owner.Name, Owner.Alias, Account.Name, Description, CreatedDate\nFROM Task\nWHERE Subject = 'Chamada'`}
                className="font-mono text-xs"
                required
              />
              <p className="text-xs text-muted-foreground">A query deve retornar registros individuais com: Id, Owner.Alias (para match), e opcionalmente Owner.Name, Account.Name, Description, CreatedDate.</p>
            </div>
            <div className="space-y-1">
              <Label>Campo do alias</Label>
              <Input
                value={form.sf_alias_field}
                onChange={e => setForm(f => ({ ...f, sf_alias_field: e.target.value }))}
                placeholder="Owner.Alias"
              />
              <p className="text-xs text-muted-foreground">Campo da SOQL que contém o alias do usuário no Salesforce.</p>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Frequência de sincronização *</Label>
              <Select value={form.sf_frequency} onValueChange={v => setForm(f => ({ ...f, sf_frequency: (v ?? '') as typeof f.sf_frequency }))}>
                <SelectTrigger><span>{form.sf_frequency ? frequencyLabels[form.sf_frequency] : 'Selecione...'}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5min">A cada 5 minutos</SelectItem>
                  <SelectItem value="daily">1x por dia (horário)</SelectItem>
                  <SelectItem value="weekly">1x por semana (dia + horário)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(form.sf_frequency === 'daily' || form.sf_frequency === 'weekly') && (
              <div className="space-y-1">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={form.sf_run_time}
                  onChange={e => setForm(f => ({ ...f, sf_run_time: e.target.value }))}
                  required
                />
              </div>
            )}
            {form.sf_frequency === 'weekly' && (
              <div className="space-y-1">
                <Label>Dia da semana</Label>
                <Select value={form.sf_run_day} onValueChange={v => setForm(f => ({ ...f, sf_run_day: v ?? '' }))}>
                  <SelectTrigger><span>{form.sf_run_day !== '' ? dayLabels[form.sf_run_day] : 'Selecione...'}</span></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Domingo</SelectItem>
                    <SelectItem value="1">Segunda-feira</SelectItem>
                    <SelectItem value="2">Terça-feira</SelectItem>
                    <SelectItem value="3">Quarta-feira</SelectItem>
                    <SelectItem value="4">Quinta-feira</SelectItem>
                    <SelectItem value="5">Sexta-feira</SelectItem>
                    <SelectItem value="6">Sábado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        <div className="space-y-1 col-span-2">
          <Label>Descrição</Label>
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Detalhes da regra..." />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>{loading ? 'Salvando...' : 'Salvar regra'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { setOpen(false); resetForm() }}>Cancelar</Button>
      </div>
    </form>
  )
}
