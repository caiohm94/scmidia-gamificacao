import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { format } from 'date-fns'
import { History } from 'lucide-react'

type TransactionRow = {
  id: string
  points: number
  event_date: string
  status: 'active' | 'reversed'
  origin: string
  created_at: string
  users: { name: string } | null
  scoring_rules: { name: string } | null
  campaigns: { name: string } | null
}

export default async function PointsHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign_id?: string; from?: string; to?: string; page?: string }>
}) {
  await requireRole('manager')
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const pageSize = 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createClient()

  let query = supabase
    .from('point_transactions')
    .select('id, points, event_date, status, origin, created_at, users(name), scoring_rules(name), campaigns(name)')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params.campaign_id) query = query.eq('campaign_id', params.campaign_id)
  if (params.from) query = query.gte('event_date', params.from)
  if (params.to) query = query.lte('event_date', params.to)

  const { data: transactions, error } = await query
  const rows = (transactions ?? []) as TransactionRow[]

  const { data: campaigns } = await supabase.from('campaigns').select('id, name').order('name')

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <History size={18} color="#8DB23C" />
          </div>
          <h1 className="sc-page-title">Auditoria de Pontos</h1>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'rgba(63,62,62,0.45)', fontFamily: 'var(--font-outfit, sans-serif)' }}>Página {page}</span>
      </div>

      <div className="p-6 space-y-4">
        {/* Filters */}
        <form method="GET" className="flex flex-wrap gap-3">
          <select name="campaign_id" defaultValue={params.campaign_id ?? ''}
            style={{ border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#3F3E3E', background: '#fff' }}>
            <option value="">Todas as campanhas</option>
            {(campaigns ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" name="from" defaultValue={params.from ?? ''}
            style={{ border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#3F3E3E' }} />
          <input type="date" name="to" defaultValue={params.to ?? ''}
            style={{ border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#3F3E3E' }} />
          <button type="submit" className="sc-btn-primary text-sm cursor-pointer">Filtrar</button>
          <a href="/manager/points/history" className="sc-btn-outline text-sm" style={{ display: 'inline-flex', alignItems: 'center' }}>Limpar</a>
        </form>

        {error && <p style={{ color: '#c0622a', fontSize: '0.85rem' }}>Erro: {error.message}</p>}

        <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(63,62,62,0.04)', borderBottom: '1px solid rgba(63,62,62,0.08)' }}>
                {['Data', 'Participante', 'Critério', 'Pontos', 'Status', 'Campanha', 'Origem'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left whitespace-nowrap" style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 500, fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)', letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Nenhuma transação encontrada.</td></tr>
              ) : rows.map((tx, i) => (
                <tr key={tx.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(63,62,62,0.06)', opacity: tx.status === 'reversed' ? 0.45 : 1 }}>
                  <td className="px-3 py-2.5" style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.5)', whiteSpace: 'nowrap' }}>{format(new Date(tx.event_date), 'dd/MM/yy')}</td>
                  <td className="px-3 py-2.5" style={{ fontWeight: 500, whiteSpace: 'nowrap', color: '#3F3E3E' }}>{tx.users?.name ?? '—'}</td>
                  <td className="px-3 py-2.5" style={{ color: 'rgba(63,62,62,0.6)' }}>{tx.scoring_rules?.name ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <span style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600, fontSize: '0.78rem', color: tx.points > 0 ? '#5C7435' : '#c0622a', background: tx.points > 0 ? 'rgba(92,116,53,0.1)' : 'rgba(192,98,42,0.1)', padding: '0.1rem 0.45rem', borderRadius: '0 0.3rem 0.3rem 0.3rem' }}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span style={{ fontSize: '0.7rem', fontWeight: 500, padding: '0.1rem 0.5rem', borderRadius: '0 0.3rem 0.3rem 0.3rem', background: tx.status === 'active' ? 'rgba(141,178,60,0.1)' : 'rgba(63,62,62,0.06)', color: tx.status === 'active' ? '#5C7435' : 'rgba(63,62,62,0.45)' }}>
                      {tx.status === 'active' ? 'Ativo' : 'Estornado'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5" style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.5)' }}>{tx.campaigns?.name ?? '—'}</td>
                  <td className="px-3 py-2.5" style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.4)', textTransform: 'capitalize' }}>{tx.origin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          {page > 1 && (
            <a href={`?${new URLSearchParams({ ...params, page: String(page - 1) })}`} className="sc-btn-outline text-sm" style={{ display: 'inline-flex', alignItems: 'center' }}>← Anterior</a>
          )}
          {rows.length === pageSize && (
            <a href={`?${new URLSearchParams({ ...params, page: String(page + 1) })}`} className="sc-btn-outline text-sm" style={{ display: 'inline-flex', alignItems: 'center' }}>Próxima →</a>
          )}
        </div>
      </div>
    </div>
  )
}
