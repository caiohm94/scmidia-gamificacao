import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

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
  searchParams: Promise<{
    campaign_id?: string
    user_id?: string
    from?: string
    to?: string
    page?: string
  }>
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
  if (params.user_id) query = query.eq('user_id', params.user_id)
  if (params.from) query = query.gte('event_date', params.from)
  if (params.to) query = query.lte('event_date', params.to)

  const { data: transactions, error } = await query
  const rows = (transactions ?? []) as TransactionRow[]

  // Campaign list for filter dropdown
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name')
    .order('name')

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Auditoria de Pontos</h1>
        <span className="text-sm text-muted-foreground">Página {page}</span>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 text-sm">
        <select
          name="campaign_id"
          defaultValue={params.campaign_id ?? ''}
          className="border rounded px-2 py-1 bg-background text-foreground"
        >
          <option value="">Todas as campanhas</option>
          {(campaigns ?? []).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <input
          type="date"
          name="from"
          defaultValue={params.from ?? ''}
          className="border rounded px-2 py-1 bg-background text-foreground"
          placeholder="De"
        />
        <input
          type="date"
          name="to"
          defaultValue={params.to ?? ''}
          className="border rounded px-2 py-1 bg-background text-foreground"
          placeholder="Até"
        />

        <button
          type="submit"
          className="px-3 py-1 rounded bg-primary text-primary-foreground font-medium"
        >
          Filtrar
        </button>
        <a href="/manager/points/history" className="px-3 py-1 rounded border text-muted-foreground">
          Limpar
        </a>
      </form>

      {error && (
        <p className="text-sm text-destructive">Erro ao carregar transações: {error.message}</p>
      )}

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Data', 'Participante', 'Critério', 'Pontos', 'Status', 'Campanha', 'Origem'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhuma transação encontrada.
                </td>
              </tr>
            ) : (
              rows.map(tx => (
                <tr
                  key={tx.id}
                  className={`border-t ${tx.status === 'reversed' ? 'opacity-50 line-through' : ''}`}
                >
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(tx.event_date), 'dd/MM/yy')}
                  </td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    {tx.users?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {tx.scoring_rules?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={tx.points > 0 ? 'default' : 'destructive'}
                      className="text-xs tabular-nums"
                    >
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={tx.status === 'active' ? 'outline' : 'secondary'}
                      className="text-xs"
                    >
                      {tx.status === 'active' ? 'Ativo' : 'Estornado'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {tx.campaigns?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground capitalize">
                    {tx.origin}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex gap-2 text-sm">
        {page > 1 && (
          <a
            href={`?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
            className="px-3 py-1 rounded border hover:bg-muted"
          >
            ← Anterior
          </a>
        )}
        {rows.length === pageSize && (
          <a
            href={`?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
            className="px-3 py-1 rounded border hover:bg-muted"
          >
            Próxima →
          </a>
        )}
      </div>
    </div>
  )
}
