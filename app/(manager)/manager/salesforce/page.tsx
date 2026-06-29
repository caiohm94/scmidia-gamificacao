import { createClient } from '@/lib/supabase/server'
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

type Props = { searchParams: Promise<{ campaign_id?: string; rule_id?: string }> }

export default async function SalesforceImportsPage({ searchParams }: Props) {
  await requireRole('manager')
  const { campaign_id, rule_id } = await searchParams
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name')
    .order('created_at', { ascending: false })

  let rulesQuery = supabase
    .from('scoring_rules')
    .select('id, name, campaign_id')
    .eq('data_origin', 'salesforce')
    .order('created_at', { ascending: false })
  if (campaign_id) rulesQuery = rulesQuery.eq('campaign_id', campaign_id)
  const { data: rules } = await rulesQuery

  let recordsQuery = supabase
    .from('salesforce_records')
    .select('id, sf_id, sf_created_at, imported_at, owner_name, sf_alias, account_name, description, user_id, transaction_id, scoring_rules(name)')
    .order('imported_at', { ascending: false })
    .limit(200)
  if (rule_id) recordsQuery = recordsQuery.eq('scoring_rule_id', rule_id)
  else if (campaign_id) recordsQuery = recordsQuery.eq('campaign_id', campaign_id)

  const { data: recordsRaw } = await recordsQuery
  const records = (recordsRaw ?? []) as unknown as RecordRow[]

  const thStyle: React.CSSProperties = {
    padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.72rem',
    fontWeight: 600, color: 'rgba(63,62,62,0.5)',
    borderBottom: '1px solid rgba(63,62,62,0.08)', whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '0.65rem 1rem', fontSize: '0.78rem', color: '#3F3E3E',
    borderBottom: '1px solid rgba(63,62,62,0.06)', verticalAlign: 'top',
  }
  const dash = <span style={{ color: 'rgba(63,62,62,0.3)' }}>—</span>

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
        {/* Filtros */}
        <form method="GET" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            name="campaign_id"
            defaultValue={campaign_id ?? ''}
            style={{ border: '1px solid rgba(63,62,62,0.15)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.4rem 0.7rem', fontSize: '0.8rem', color: '#3F3E3E', background: '#fff', cursor: 'pointer' }}
          >
            <option value="">Todas as campanhas</option>
            {(campaigns ?? []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            name="rule_id"
            defaultValue={rule_id ?? ''}
            style={{ border: '1px solid rgba(63,62,62,0.15)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.4rem 0.7rem', fontSize: '0.8rem', color: '#3F3E3E', background: '#fff', cursor: 'pointer' }}
          >
            <option value="">Todas as regras</option>
            {(rules ?? []).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            type="submit"
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: '#8DB23C', color: '#fff', border: 'none', borderRadius: '0 0.4rem 0.4rem 0.4rem', cursor: 'pointer' }}
          >
            Filtrar
          </button>
          {(campaign_id || rule_id) && (
            <a href="/manager/salesforce" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', color: 'rgba(63,62,62,0.5)', border: '1px solid rgba(63,62,62,0.15)', borderRadius: '0 0.4rem 0.4rem 0.4rem', textDecoration: 'none' }}>
              Limpar
            </a>
          )}
        </form>

        {records.length === 0 ? (
          <div className="sc-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <CloudDownload size={32} color="rgba(63,62,62,0.2)" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ fontSize: '0.85rem', color: 'rgba(63,62,62,0.4)' }}>
              Nenhum registro importado ainda.
            </p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.3)', marginTop: '0.25rem' }}>
              Clique em &quot;Sync SF&quot; em uma regra Salesforce para importar.
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
                      <td style={tdStyle}>{r.account_name ?? dash}</td>
                      <td style={{ ...tdStyle, maxWidth: 180 }}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.75rem', color: 'rgba(63,62,62,0.65)' } as React.CSSProperties}>
                          {r.description ?? dash}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)' }}>
                          {r.scoring_rules?.name ?? dash}
                        </span>
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
