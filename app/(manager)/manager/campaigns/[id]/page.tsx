import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RuleForm } from '@/components/campaign/RuleForm'
import { ParticipantForm } from '@/components/campaign/ParticipantForm'
import { RemoveParticipantButton } from '@/components/campaign/RemoveParticipantButton'
import { ToggleRuleButton } from '@/components/campaign/ToggleRuleButton'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { headers } from 'next/headers'

const statusLabel: Record<string, string> = { draft: 'Rascunho', active: 'Ativa', closed: 'Encerrada' }
const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary', active: 'default', closed: 'outline'
}

type Props = { params: Promise<{ id: string }> }

export default async function CampaignDetailPage({ params }: Props) {
  await requireRole('manager')
  const { id } = await params
  const supabase = await createClient()

  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  const { data: campaign } = await supabase
    .from('campaigns').select('*').eq('id', id).single()

  if (!campaign) notFound()

  type ParticipantRow = { id: string; user_id: string; joined_at: string; users: { name: string; email: string } | null }
  const { data: participantsRaw } = await supabase
    .from('campaign_participants')
    .select('id, user_id, joined_at, users(name, email)')
    .eq('campaign_id', id)
    .order('joined_at', { ascending: false })
  const participants = (participantsRaw ?? []) as unknown as ParticipantRow[]

  type RuleRow = { id: string; name: string; points: number; period: string; description: string | null; is_active: boolean }
  const { data: rulesRaw } = await supabase
    .from('scoring_rules')
    .select('id, name, points, period, description, is_active')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true })
  const rules = (rulesRaw ?? []) as unknown as RuleRow[]

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge variant={statusVariant[campaign.status]}>{statusLabel[campaign.status]}</Badge>
          </div>
          {campaign.description && <p className="text-muted-foreground">{campaign.description}</p>}
          {campaign.starts_at && (
            <p className="text-sm text-muted-foreground">
              {format(new Date(campaign.starts_at), "dd 'de' MMM yyyy", { locale: ptBR })}
              {campaign.ends_at && ` → ${format(new Date(campaign.ends_at), "dd 'de' MMM yyyy", { locale: ptBR })}`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/manager/campaigns/${id}/edit`}>
            <Button size="sm" variant="outline">Editar campanha</Button>
          </Link>
          <Link href={`/manager/points?campaign_id=${id}`}>
            <Button size="sm">Lançar pontos</Button>
          </Link>
          <Link href="/manager/campaigns">
            <Button variant="outline" size="sm">← Voltar</Button>
          </Link>
        </div>
      </div>

      {/* Token do painel TV */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <p className="text-sm font-medium mb-1">Painel TV</p>
        <code className="text-xs break-all text-muted-foreground">
          {`${baseUrl}/display/${campaign.slug}?token=${campaign.display_token}`}
        </code>
      </div>

      {/* Regras de pontuação */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Regras de pontuação</h2>
          <span className="text-sm text-muted-foreground">{rules.length} regra(s)</span>
        </div>
        {rules.length > 0 && (
          <div className="border rounded-lg divide-y">
            {rules.map(r => (
              <div key={r.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className={`font-medium text-sm ${r.is_active ? '' : 'line-through text-muted-foreground'}`}>{r.name}</p>
                  {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-semibold text-sm">{r.points} pts</p>
                    <p className="text-xs text-muted-foreground">{r.period ?? ''}</p>
                  </div>
                  <ToggleRuleButton campaignId={id} ruleId={r.id} isActive={r.is_active} />
                </div>
              </div>
            ))}
          </div>
        )}
        <RuleForm campaignId={id} />
      </div>

      {/* Participantes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Participantes</h2>
          <span className="text-sm text-muted-foreground">{participants.length} participante(s)</span>
        </div>
        {participants.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-lg p-4">Nenhum participante ainda.</p>
        ) : (
          <div className="border rounded-lg divide-y">
            {participants.map(p => (
              <div key={p.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{p.users?.name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{p.users?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(p.joined_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <RemoveParticipantButton campaignId={id} userId={p.user_id} />
                </div>
              </div>
            ))}
          </div>
        )}
        <ParticipantForm campaignId={id} />
      </div>
    </div>
  )
}
