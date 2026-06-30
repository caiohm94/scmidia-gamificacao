import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Download, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { CampaignRanking } from '@/types/database'

const MEDALS = ['🥇', '🥈', '🥉']

const fnLabel: Record<string, string> = {
  internal_seller: 'Vendedor Interno',
  external_seller: 'Vendedor Externo',
  hunter: 'Hunter',
  manager: 'Gestor',
}

function RankingList({ rows }: { rows: CampaignRanking[] }) {
  if (rows.length === 0) {
    return (
      <div className="sc-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'rgba(63,62,62,0.35)' }}>Nenhum participante no ranking ainda.</p>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {rows.map(row => {
        const isTop3 = row.position <= 3
        return (
          <div key={row.user_id} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 1rem',
            borderRadius: '0 0.75rem 0.75rem 0.75rem',
            background: '#fff',
            border: '1px solid rgba(63,62,62,0.08)',
            boxShadow: isTop3 ? '0 1px 8px rgba(0,0,0,0.06)' : undefined,
          }}>
            {/* Position */}
            <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
              {isTop3
                ? <span style={{ fontSize: '1.35rem' }}>{MEDALS[row.position - 1]}</span>
                : <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(63,62,62,0.06)',
                    fontSize: '0.75rem', fontWeight: 700,
                    color: 'rgba(63,62,62,0.45)',
                  }}>{row.position}</span>}
            </div>

            {/* Avatar */}
            <div style={{
              width: 56, height: 56, flexShrink: 0,
              borderRadius: '0 0.5rem 0.5rem 0.5rem',
              overflow: 'hidden',
              border: '1.5px solid rgba(63,62,62,0.08)',
            }}>
              {row.avatar_url ? (
                <Image src={row.avatar_url} alt={row.name ?? ''} width={112} height={112} priority={row.position <= 5} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#8DB23C,#5C7435)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-outfit)' }}>
                  {row.name?.charAt(0).toUpperCase() ?? '?'}
                </div>
              )}
            </div>

            {/* Name + tag */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontWeight: 600, fontSize: '0.9rem',
                color: '#3F3E3E', fontFamily: 'var(--font-outfit)',
                margin: 0, lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {row.name || '—'}
              </p>
              <div style={{ marginTop: '0.2rem', display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {row.team_name ? (
                  <span style={{
                    fontSize: '0.63rem', padding: '0.05rem 0.35rem',
                    borderRadius: '0 0.2rem 0.2rem 0.2rem',
                    background: (row.team_color ?? '#8DB23C') + '20',
                    color: row.team_color ?? '#8DB23C', fontWeight: 600,
                  }}>{row.team_name}</span>
                ) : row.function ? (
                  <span style={{ fontSize: '0.63rem', color: 'rgba(63,62,62,0.4)' }}>{fnLabel[row.function] ?? row.function}</span>
                ) : null}
              </div>
            </div>

            {/* Streak */}
            {row.current_streak > 0 && (
              <div style={{ flexShrink: 0, fontSize: '0.78rem', fontWeight: 700, color: '#f97316' }}>
                🔥{row.current_streak}
              </div>
            )}

            {/* Points */}
            <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 72 }}>
              <p style={{
                fontFamily: 'var(--font-outfit)', fontWeight: 800,
                fontSize: isTop3 ? '1.25rem' : '1.05rem',
                color: isTop3 ? '#5C7435' : '#3F3E3E',
                margin: 0, lineHeight: 1,
              }}>
                {row.total_points.toLocaleString('pt-BR')}
              </p>
              <p style={{ fontSize: '0.58rem', color: 'rgba(63,62,62,0.35)', margin: 0 }}>pts</p>
            </div>

            {/* Link to detail */}
            <Link
              href={`/manager/preview/${row.user_id}`}
              title="Ver detalhamento"
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: '0 0.4rem 0.4rem 0.4rem',
                background: 'rgba(141,178,60,0.08)',
                color: '#8DB23C', textDecoration: 'none',
                transition: 'background 0.15s',
              }}
            >
              <ExternalLink size={14} />
            </Link>
          </div>
        )
      })}
    </div>
  )
}

export default async function ManagerRankingsPage({ searchParams }: { searchParams: Promise<{ campaign_id?: string }> }) {
  await requireRole('manager')
  const { campaign_id } = await searchParams
  const supabase = await createClient()

  const { data: campaigns } = await supabase.from('campaigns').select('id, name').neq('status', 'draft')
  const activeCampaignId = campaign_id ?? campaigns?.[0]?.id

  const ranking = activeCampaignId
    ? await getRanking(supabase, { campaign_id: activeCampaignId })
    : []

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={18} color="#8DB23C" />
          </div>
          <h1 className="sc-page-title">Rankings</h1>
        </div>
        <div className="flex items-center gap-3">
          {(campaigns ?? []).length > 1 && (
            <form method="GET" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select name="campaign_id" defaultValue={activeCampaignId ?? ''}
                style={{ border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#3F3E3E' }}>
                {(campaigns ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" className="sc-btn-primary text-sm cursor-pointer" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>Filtrar</button>
            </form>
          )}
          <a href={`/api/rankings/export?campaign_id=${activeCampaignId}`}>
            <button className="sc-btn-outline text-sm cursor-pointer flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Download size={14} />
              Exportar CSV
            </button>
          </a>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="overall">
          <TabsList>
            <TabsTrigger value="overall">Geral</TabsTrigger>
            <TabsTrigger value="sellers">Vendedores Int.</TabsTrigger>
            <TabsTrigger value="external">Vendedores Ext.</TabsTrigger>
            <TabsTrigger value="hunters">Hunters</TabsTrigger>
          </TabsList>
          <TabsContent value="overall" className="mt-4">
            <RankingList rows={ranking} />
          </TabsContent>
          <TabsContent value="sellers" className="mt-4">
            <RankingList rows={ranking.filter(r => r.function === 'internal_seller')} />
          </TabsContent>
          <TabsContent value="external" className="mt-4">
            <RankingList rows={ranking.filter(r => r.function === 'external_seller')} />
          </TabsContent>
          <TabsContent value="hunters" className="mt-4">
            <RankingList rows={ranking.filter(r => r.function === 'hunter')} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
