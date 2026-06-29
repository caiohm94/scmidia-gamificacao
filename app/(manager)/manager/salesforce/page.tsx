import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/helpers'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CloudDownload } from 'lucide-react'

type RecordRow = {
  id: string
  sf_id: string
  sf_created_at: string | null
  imported_at: string
  owner_name: string | null
  sf_alias: string | null
  account_name: string | null
  description: string | null
  user_id: string | null
  transaction_id: string | null
  scoring_rules: { name: string } | null
}

type Props = { searchParams: Promise<{ from?: string; to?: string; owner?: string; rule_id?: string }> }

export default async function SalesforceImportsPage({ searchParams }: Props) {
  await requireRole('manager')
  const params = await searchParams
  const supabase = createAdminClient()

  const { data: rules } = await supabase
    .from('scoring_rules')
    .select('id, name')
    .eq('data_origin', 'salesforce')
    .eq('is_active', true)
    .order('name')

  let query = supabase
    .from('salesforce_records')
    .select('id, sf_id, sf_created_at, imported_at, owner_name, sf_alias, account_name, description, user_id, transaction_id, scoring_rules(name)')
    .order('sf_created_at', { ascending: false })
    .limit(500)

  if (params.from) query = query.gte('sf_created_at', params.from)
  if (params.to) query = query.lte('sf_created_at', params.to + 'T23:59:59')
  if (params.owner) query = query.ilike('owner_name', `%${params.owner}%`)
  if (params.rule_id) query = query.eq('scoring_rule_id', params.rule_id)

  const { data: recordsRaw } = await query
  const records = (recordsRaw ?? []) as unknown as RecordRow[]

  const inputStyle: React.CSSProperties = {
    border: '1px solid rgba(63,62,62,0.15)', borderRadius: '0 0.4rem 0.4rem 0.4rem',
    padding: '0.4rem 0.7rem', fontSize: '0.8rem', color: '#3F3E3E', background: '#fff',
  }
  const thStyle: React.CSSProperties = {
    padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.72rem',
    fontWeight: 600, color: 'rgba(63,62,62,0.5)',
    borderBottom: '1px solid rgba(63,62,62,0.08)', whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '0.6rem 1rem', fontSize: '0.78rem', color: '#3F3E3E',
    borderBottom: '1px solid rgba(63,62,62,0.06)', whiteSpace: 'nowrap',
  }
  const dash = <span style={{ color: 'rgba(63,62,62,0.3)' }}>—</span>
  const hasFilter = params.from || params.to || params.owner || params.rule_id

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CloudDownload size={18} color="#8DB23C" />
          </div>
          <div>
            <h1 className="sc-page-title">Importações Salesforce</h1>
            <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.45)', fontFamily: 'var(--font-outfit, sans-serif)', marginTop: '0.1rem' }}>
              {records.length} registro(s) exibido(s)
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4 max-w-7xl">
        <form method="GET" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="date" name="from" defaultValue={params.from ?? ''}
            style={inputStyle} placeholder="Data início"
          />
          <input
            type="date" name="to" defaultValue={params.to ?? ''}
            style={inputStyle} placeholder="Data fim"
          />
          <input
            type="text" name="owner" defaultValue={params.owner ?? ''}
            style={{ ...inputStyle, minWidth: 160 }} placeholder="Proprietário"
          />
          <select name="rule_id" defaultValue={params.rule_id ?? ''} style={inputStyle}>
            <option value="">Todas as regras</option>
            {(rules ?? []).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button type="submit" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: '#8DB23C', color: '#fff', border: 'none', borderRadius: '0 0.4rem 0.4rem 0.4rem', cursor: 'pointer' }}>
            Filtrar
          </button>
          {hasFilter && (
            <a href="/manager/salesforce" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', color: 'rgba(63,62,62,0.5)', border: '1px solid rgba(63,62,62,0.15)', borderRadius: '0 0.4rem 0.4rem 0.4rem', textDecoration: 'none' }}>
              Limpar
            </a>
          )}
        </form>

        {records.length === 0 ? (
          <div className="sc-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <CloudDownload size={32} color="rgba(63,62,62,0.2)" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ fontSize: '0.85rem', color: 'rgba(63,62,62,0.4)' }}>
              {hasFilter ? 'Nenhum registro encontrado com esses filtros.' : 'Nenhum registro importado ainda.'}
            </p>
          </div>
        ) : (
          <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(63,62,62,0.02)' }}>
                    <th style={thStyle}>Data SF</th>
                    <th style={thStyle}>Importado em</th>
                    <th style={thStyle}>Proprietário</th>
                    <th style={thStyle}>Alias SF</th>
                    <th style={thStyle}>Cliente</th>
                    <th style={thStyle}>Descrição</th>
                    <th style={thStyle}>Regra</th>
                    <th style={thStyle}>Pontos</th>
                    <th style={thStyle}>ID Salesforce</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} style={{ background: r.transaction_id ? 'transparent' : 'rgba(255,220,0,0.03)' }}>
                      <td style={tdStyle}>
                        {r.sf_created_at
                          ? format(new Date(r.sf_created_at), 'dd/MM/yy HH:mm', { locale: ptBR })
                          : dash}
                      </td>
                      <td style={tdStyle}>{format(new Date(r.imported_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</td>
                      <td style={tdStyle}>{r.owner_name ?? dash}</td>
                      <td style={tdStyle}>
                        {r.sf_alias
                          ? <code style={{ fontSize: '0.72rem', background: 'rgba(141,178,60,0.1)', padding: '0.1rem 0.35rem', borderRadius: '0 0.25rem 0.25rem 0.25rem' }}>{r.sf_alias}</code>
                          : dash}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.account_name ?? dash}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.65)' }}>
                          {r.description ?? dash}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)' }}>
                        {r.scoring_rules?.name ?? dash}
                      </td>
                      <td style={tdStyle}>
                        {r.transaction_id
                          ? <span style={{ color: '#5C7435', fontWeight: 600, fontSize: '0.78rem' }}>✓ gerado</span>
                          : <span style={{ color: 'rgba(63,62,62,0.35)', fontSize: '0.72rem' }}>sem match</span>}
                      </td>
                      <td style={tdStyle}>
                        <code style={{ fontSize: '0.65rem', color: 'rgba(63,62,62,0.35)' }}>{r.sf_id}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
