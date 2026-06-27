'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { campaignSchema, type CampaignInput } from '@/schemas/campaign'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props { defaultValues?: Partial<CampaignInput>; campaignId?: string }

export function CampaignForm({ defaultValues, campaignId }: Props) {
  const router = useRouter()
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
    useForm<CampaignInput>({ resolver: zodResolver(campaignSchema), defaultValues })

  async function onSubmit(values: CampaignInput) {
    const url = campaignId ? `/api/campaigns/${campaignId}` : '/api/campaigns'
    const method = campaignId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
    if (!res.ok) { toast.error('Erro ao salvar campanha'); return }
    toast.success(campaignId ? 'Campanha atualizada!' : 'Campanha criada!')
    router.push('/manager/campaigns')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Nome</Label>
          <Input {...register('name')} placeholder="Missão Hexa" />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Slug (URL)</Label>
          <Input {...register('slug')} placeholder="missao-hexa" />
          {errors.slug && <p className="text-xs text-red-500">{errors.slug.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label>Descrição</Label>
        <Textarea {...register('description')} rows={3} />
      </div>
      <div className="space-y-1">
        <Label>Regras Gerais</Label>
        <Textarea {...register('rules')} rows={4} />
      </div>
      <div className="space-y-1">
        <Label>Premiação</Label>
        <Textarea {...register('prizes')} rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Início</Label>
          <Input type="datetime-local" {...register('starts_at')} />
        </div>
        <div className="space-y-1">
          <Label>Fim</Label>
          <Input type="datetime-local" {...register('ends_at')} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Status</Label>
        <Select onValueChange={v => setValue('status', v as CampaignInput['status'])} defaultValue={defaultValues?.status ?? 'draft'}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="active">Ativa</SelectItem>
            <SelectItem value="closed">Encerrada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : campaignId ? 'Salvar alterações' : 'Criar campanha'}
      </Button>
    </form>
  )
}
