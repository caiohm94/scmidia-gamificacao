import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Trophy, Plus } from 'lucide-react'

const statusLabel: Record<string, string> = { draft: 'Rascunho', active: 'Ativa', closed: 'Encerrada' }
const statusColor: Record<string, string> = {
  draft: 'rgba(63,62,62,0.5)',
  active: '#8DB23C',
  closed: 'rgba(63,62,62,0.3)',
}
const statusBg: Record<string, string> = {
  draft: 'rgba(63,62,62,0.07)',
  active: 'rgba(141,178,60,0.12)',
  closed: 'rgba(63,62,62,0.04)',
}

export default async function CampaignsPage() {
  await requireRole('manager')
  const supabase = await createClient()
  const { data: campaigns } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })

  return (
    <div>
      {/* Page header */}
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={18} color="#8DB23C" />
          </div>
          <h1 className="sc-page-title">Campanhas</h1>
        </div>
        <Link href="/manager/campaigns/new">
          <button className="sc-btn-primary flex items-center gap-2 text-sm cursor-pointer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={15} />
            Nova campanha
          </button>
        </Link>
      </div>

      {/* List */}
      <div className="p-6 space-y-3">
        {(!campaigns || campaigns.length === 0) && (
          <div className="sc-card text-center py-12">
            <Trophy size={32} color="rgba(63,62,62,0.2)" className="mx-auto mb-3" />
            <p style={{ color: 'rgba(63,62,62,0.5)', fontFamily: 'var(--font-outfit, sans-serif)' }}>Nenhuma campanha criada ainda.</p>
          </div>
        )}
        {campaigns?.map(c => (
          <div key={c.id} className="sc-card flex items-center justify-between" style={{ transition: 'box-shadow 0.15s' }}>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h2 className="sc-heading text-base">{c.name}</h2>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 500,
                  fontFamily: 'var(--font-outfit, sans-serif)',
                  background: statusBg[c.status], color: statusColor[c.status],
                  borderRadius: '0 0.35rem 0.35rem 0.35rem',
                }}>
                  {statusLabel[c.status]}
                </span>
              </div>
              {c.description && (
                <p style={{ fontSize: '0.85rem', color: 'rgba(63,62,62,0.6)' }}>{c.description}</p>
              )}
              {c.starts_at && (
                <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.45)' }}>
                  {format(new Date(c.starts_at), "dd 'de' MMM yyyy", { locale: ptBR })}
                  {c.ends_at && ` → ${format(new Date(c.ends_at), "dd 'de' MMM yyyy", { locale: ptBR })}`}
                </p>
              )}
            </div>
            <Link href={`/manager/campaigns/${c.id}`}>
              <button className="sc-btn-outline text-sm cursor-pointer">Gerenciar</button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
