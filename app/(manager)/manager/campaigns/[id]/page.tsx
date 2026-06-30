import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { RuleForm } from '@/components/campaign/RuleForm'
import { ParticipantForm } from '@/components/campaign/ParticipantForm'
import { RemoveParticipantButton } from '@/components/campaign/RemoveParticipantButton'
import { ToggleRuleButton } from '@/components/campaign/ToggleRuleButton'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { headers } from 'next/headers'
import { Trophy, Tv, Users, ListChecks, Edit, Target } from 'lucide-react'
import { CopyButton } from '@/components/shared/CopyButton'
import { ParticipantPhotoUpload } from '@/components/campaign/ParticipantPhotoUpload'
import { EditRuleButton } from '@/components/campaign/EditRuleButton'
import { SyncRuleButton } from '@/components/campaign/SyncRuleButton'

const statusLabel: Record<string, string> = { draft: 'Rascunho', active: 'Ativa', closed: 'Encerrada' }
const statusColor: Record<string, string> = { draft: 'rgba(63,62,62,0.45)', active: '#5C7435', closed: 'rgba(63,62,62,0.3)' }
const statusBg: Record<string, string> = { draft: 'rgba(63,62,62,0.07)', active: 'rgba(141,178,60,0.12)', closed: 'rgba(63,62,62,0.04)' }

type Props = { params: Promise<{ id: string }> }

export default async function CampaignDetailPage({ params }: Props) {
  await requireRole('manager')
  const { id } = await params
  const supabase = await createClient()

  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single()
  if (!campaign) notFound()

  type ParticipantRow = { id: string; user_id: string; joined_at: string; photo_url: string | null; users: { name: string; email: string } | null }
  const { data: participantsRaw } = await supabase
    .from('campaign_participants')
    .select('id, user_id, joined_at, photo_url, users(name, email)')
    .eq('campaign_id', id)
    .order('joined_at', { ascending: false })
  const participants = (participantsRaw ?? []) as unknown as ParticipantRow[]

  type RuleRow = {
    id: string; name: string; points: number; target_period: string | null
    description: string | null; is_active: boolean; data_origin: string | null
    applies_to: string | null; category: string | null
    sf_soql: string | null; sf_value_field: string | null; sf_alias_field: string | null
    sf_frequency: string | null; sf_run_time: string | null; sf_run_day: number | null
    value_type: string | null; decimal_places: number | null; is_cumulative: boolean | null
  }
  const { data: rulesRaw, error: rulesError } = await supabase
    .from('scoring_rules')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true })
  if (rulesError) console.error('[rules]', rulesError.message)
  const rules = (rulesRaw ?? []) as unknown as RuleRow[]

  const tvUrl = `${baseUrl}/display/${campaign.slug}?token=${campaign.display_token}`

  return (
    <div>
      {/* Header */}
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: statusBg[campaign.status], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={18} color={statusColor[campaign.status]} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="sc-page-title">{campaign.name}</h1>
              <span style={{ display: 'inline-flex', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 500, fontFamily: 'var(--font-outfit, sans-serif)', background: statusBg[campaign.status], color: statusColor[campaign.status], borderRadius: '0 0.35rem 0.35rem 0.35rem' }}>
                {statusLabel[campaign.status]}
              </span>
            </div>
            {campaign.starts_at && (
              <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.45)', fontFamily: 'var(--font-outfit, sans-serif)', marginTop: '0.1rem' }}>
                {format(new Date(campaign.starts_at), "dd 'de' MMM yyyy", { locale: ptBR })}
                {campaign.ends_at && ` → ${format(new Date(campaign.ends_at), "dd 'de' MMM yyyy", { locale: ptBR })}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/manager/points?campaign_id=${id}`}>
            <button className="sc-btn-primary text-sm cursor-pointer flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Target size={14} />
              Lançar pontos
            </button>
          </Link>
          <Link href={`/manager/campaigns/${id}/edit`}>
            <button className="sc-btn-outline text-sm cursor-pointer flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Edit size={14} />
              Editar
            </button>
          </Link>
          <Link href="/manager/campaigns">
            <button className="sc-btn-outline text-sm cursor-pointer">← Voltar</button>
          </Link>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-4xl">
        {/* TV Panel */}
        <div className="sc-card-accent">
          <div className="flex items-center gap-2 mb-2">
            <Tv size={15} color="#8DB23C" />
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#3F3E3E', fontFamily: 'var(--font-outfit, sans-serif)' }}>Painel TV</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <code style={{ fontSize: '0.73rem', color: 'rgba(63,62,62,0.6)', wordBreak: 'break-all', flex: 1 }}>{tvUrl}</code>
            <CopyButton text={tvUrl} />
          </div>
        </div>

        {/* Rules */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListChecks size={16} color="#3F3E3E" />
              <h2 className="sc-heading">Regras de pontuação</h2>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.45)' }}>{rules.length} regra(s)</span>
          </div>
          {rules.length > 0 && (() => {
            const groups: { key: string; label: string }[] = [
              { key: 'all', label: 'Todos' },
              { key: 'internal_seller', label: 'Vendedor Interno' },
              { key: 'external_seller', label: 'Vendedor Externo' },
              { key: 'hunter', label: 'Hunter' },
            ]
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {groups.map(g => {
                  const groupRules = rules.filter(r => (r.applies_to ?? 'all') === g.key)
                  if (groupRules.length === 0) return null
                  return (
                    <div key={g.key}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(63,62,62,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem', paddingLeft: '0.1rem' }}>
                        {g.label}
                      </p>
                      <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
                        {groupRules.map((r, i) => (
                          <div key={r.id} className="flex items-center justify-between px-4 py-3"
                            style={{ borderTop: i > 0 ? '1px solid rgba(63,62,62,0.07)' : 'none' }}>
                            <div>
                              <p style={{ fontWeight: 500, fontSize: '0.875rem', color: r.is_active ? '#3F3E3E' : 'rgba(63,62,62,0.35)', textDecoration: r.is_active ? 'none' : 'line-through' }}>{r.name}</p>
                              {r.description && <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.5)', marginTop: '0.1rem' }}>{r.description}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 700, fontSize: '0.875rem', color: '#3F3E3E' }}>{r.points} pts</p>
                                {r.target_period && <p style={{ fontSize: '0.7rem', color: 'rgba(63,62,62,0.4)' }}>{r.target_period}</p>}
                              </div>
                              {r.data_origin === 'salesforce' && (
                                <SyncRuleButton ruleId={r.id} ruleName={r.name} />
                              )}
                              <EditRuleButton campaignId={id} rule={r} />
                              <ToggleRuleButton campaignId={id} ruleId={r.id} isActive={r.is_active} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
          <RuleForm campaignId={id} />
        </div>

        {/* Participants */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} color="#3F3E3E" />
              <h2 className="sc-heading">Participantes</h2>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.45)' }}>{participants.length} participante(s)</span>
          </div>
          {participants.length === 0 ? (
            <div className="sc-card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'rgba(63,62,62,0.4)' }}>Nenhum participante ainda.</p>
            </div>
          ) : (
            <div className="sc-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '0.75rem' }}>
              {participants.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: i > 0 ? '1px solid rgba(63,62,62,0.07)' : 'none' }}>
                  <ParticipantPhotoUpload
                    campaignId={id}
                    userId={p.user_id}
                    currentPhotoUrl={p.photo_url}
                    participantName={p.users?.name ?? '?'}
                  />
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '0.875rem', color: '#3F3E3E' }}>{p.users?.name ?? '—'}</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.5)' }}>{p.users?.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.35)' }}>
                      {format(new Date(p.joined_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    <RemoveParticipantButton campaignId={id} userId={p.user_id} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <ParticipantForm campaignId={id} existingIds={participants.map(p => p.user_id)} />
        </div>
      </div>
    </div>
  )
}
