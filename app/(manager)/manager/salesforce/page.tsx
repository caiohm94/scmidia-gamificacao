import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/helpers'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CloudDownload } from 'lucide-react'
import { RematchButton } from '@/components/salesforce/RematchButton'
import { SFDiagnostic } from '@/components/salesforce/SFDiagnostic'

type RecordRow = {
  id: string; sf_id: string; sf_created_at: string | null; imported_at: string
  owner_name: string | null; sf_alias: string | null; account_name: string | null
  description: string | null; user_id: string | null; transaction_id: string | null
  scoring_rules: { name: string } | null
}

type LogRow = {
  id: string; rule_name: string; triggered_at: string
  sf_found: number; inserted: number; skipped: number
  errors: string[]; status: string
  users: { name: string } | null
}

type AliasRow = { sf_alias: string | null; owner_name: string | null; count: number; matched: boolean }

type Props = { searchParams: Promise<{ from?: string; to?: string; owner?: string; rule_id?: string; tab?: string }> }

const statusStyle: Record<string, React.CSSProperties> = {
  success:          { background: 'rgba(92,116,53,0.12)', color: '#5C7435' },
  partial:          { background: 'rgba(255,180,0,0.12)', color: '#8B6914' },
  no_match:         { background: 'rgba(220,53,69,0.08)', color: '#dc3545' },
  already_imported: { background: 'rgba(63,62,62,0.07)', color: 'rgba(63,62,62,0.45)' },
  error:            { background: 'rgba(220,53,69,0.1)', color: '#dc3545' },
}
const statusLabel: Record<string, string> = {
  success: 'Inserido', partial: 'Parcial', no_match: 'Sem match', already_imported: 'Já importado', error: 'Erro',
}

export default async function SalesforceImportsPage({ searchParams }: Props) {
  await requireRole('manager')
  const params = await searchParams
  const tab = params.tab ?? 'records'
  const supabase = createAdminClient()

  const { data: rules } = await supabase
    .from('scoring_rules').select('id, name, sf_soql, sf_frequency, sf_alias_field')
    .eq('data_origin', 'salesforce').eq('is_active', true).order('name')

  // Records tab
  let records: RecordRow[] = []
  if (tab === 'records') {
    let query = supabase
      .from('salesforce_records')
      .select('id, sf_id, sf_created_at, imported_at, owner_name, sf_alias, account_name, description, user_id, transaction_id, scoring_rules(name)')
      .order('sf_created_at', { ascending: false }).limit(500)
    if (params.from) query = query.gte('sf_created_at', params.from)
    if (params.to)   query = query.lte('sf_created_at', params.to + 'T23:59:59')
    if (params.owner) query = query.ilike('owner_name', `%${params.owner}%`)
    if (params.rule_id) query = query.eq('scoring_rule_id', params.rule_id)
    const { data } = await query
    records = (data ?? []) as unknown as RecordRow[]
  }

  // Aliases tab — diagnóstico de match
  let unmatched: AliasRow[] = []
  let participantAliases: { id: string; name: string; sf_alias: string | null }[] = []
  if (tab === 'aliases') {
    // Aliases que chegaram do SF sem match (user_id null)
    const { data: noMatchRecords } = await supabase
      .from('salesforce_records')
      .select('sf_alias, owner_name, user_id')
      .is('transaction_id', null)

    // Aliases com match
    const { data: matchedRecords } = await supabase
      .from('salesforce_records')
      .select('sf_alias')
      .not('transaction_id', 'is', null)

    const matchedAliases = new Set((matchedRecords ?? []).map(r => r.sf_alias).filter(Boolean))

    const countMap = new Map<string, { owner_name: string | null; count: number }>()
    for (const r of (noMatchRecords ?? [])) {
      if (!r.sf_alias) continue
      const existing = countMap.get(r.sf_alias)
      if (existing) existing.count++
      else countMap.set(r.sf_alias, { owner_name: r.owner_name, count: 1 })
    }
    unmatched = Array.from(countMap.entries())
      .map(([sf_alias, v]) => ({ sf_alias, owner_name: v.owner_name, count: v.count, matched: matchedAliases.has(sf_alias) }))
      .sort((a, b) => b.count - a.count)

    // Usuários com sf_alias configurado
    const { data: usersWithAlias } = await supabase
      .from('users')
      .select('id, name, sf_alias')
      .eq('role', 'participant')
      .order('name')
    participantAliases = (usersWithAlias ?? []) as typeof participantAliases
  }

  // Log tab
  let logs: LogRow[] = []
  if (tab === 'log') {
    const { data } = await supabase
      .from('salesforce_sync_logs')
      .select('id, rule_name, triggered_at, sf_found, inserted, skipped, errors, status, users(name)')
      .order('triggered_at', { ascending: false })
      .limit(200)
    logs = (data ?? []) as unknown as LogRow[]
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid rgba(63,62,62,0.15)', borderRadius: '0 0.4rem 0.4rem 0.4rem',
    padding: '0.4rem 0.7rem', fontSize: '0.8rem', color: '#3F3E3E', background: '#fff',
  }
  const thStyle: React.CSSProperties = {
    padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600,
    color: 'rgba(63,62,62,0.5)', borderBottom: '1px solid rgba(63,62,62,0.08)', whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '0.55rem 1rem', fontSize: '0.78rem', color: '#3F3E3E',
    borderBottom: '1px solid rgba(63,62,62,0.06)', whiteSpace: 'nowrap',
  }
  const dash = <span style={{ color: 'rgba(63,62,62,0.3)' }}>—</span>
  const hasFilter = params.from || params.to || params.owner || params.rule_id

  const tabLink = (t: string) =>
    `/manager/salesforce?tab=${t}${params.from ? `&from=${params.from}` : ''}${params.to ? `&to=${params.to}` : ''}${params.owner ? `&owner=${params.owner}` : ''}${params.rule_id ? `&rule_id=${params.rule_id}` : ''}`

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '0.5rem 1.1rem', fontSize: '0.82rem', textDecoration: 'none',
    fontFamily: 'var(--font-outfit, sans-serif)',
    color: tab === t ? '#8DB23C' : 'rgba(63,62,62,0.5)',
    borderBottom: tab === t ? '2px solid #8DB23C' : '2px solid transparent',
    marginBottom: -2, fontWeight: tab === t ? 600 : 400,
  })

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CloudDownload size={18} color="#8DB23C" />
          </div>
          <h1 className="sc-page-title">Importações Salesforce</h1>
        </div>
      </div>

      <div className="p-6 space-y-4 max-w-7xl">
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid rgba(63,62,62,0.08)', gap: '0.1rem' }}>
          <a href={tabLink('records')} style={tabStyle('records')}>Registros</a>
          <a href={tabLink('log')} style={tabStyle('log')}>Log de Sincronização</a>
          <a href={tabLink('aliases')} style={tabStyle('aliases')}>Aliases sem match</a>
          <a href={tabLink('diagnostico')} style={tabStyle('diagnostico')}>🔧 Diagnóstico</a>
        </div>

        {tab === 'diagnostico' && (
          <SFDiagnostic rules={rules ?? []} />
        )}

        {tab === 'records' && (
          <>
            <form method="GET" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="hidden" name="tab" value="records" />
              <input type="date" name="from" defaultValue={params.from ?? ''} style={inputStyle} />
              <input type="date" name="to"   defaultValue={params.to ?? ''}   style={inputStyle} />
              <input type="text" name="owner" defaultValue={params.owner ?? ''} style={{ ...inputStyle, minWidth: 160 }} placeholder="Proprietário" />
              <select name="rule_id" defaultValue={params.rule_id ?? ''} style={inputStyle}>
                <option value="">Todas as regras</option>
                {(rules ?? []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <button type="submit" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: '#8DB23C', color: '#fff', border: 'none', borderRadius: '0 0.4rem 0.4rem 0.4rem', cursor: 'pointer' }}>
                Filtrar
              </button>
              {hasFilter && (
                <a href="/manager/salesforce?tab=records" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', color: 'rgba(63,62,62,0.5)', border: '1px solid rgba(63,62,62,0.15)', borderRadius: '0 0.4rem 0.4rem 0.4rem', textDecoration: 'none' }}>
                  Limpar
                </a>
              )}
            </form>

            {records.length === 0 ? (
              <div className="sc-card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'rgba(63,62,62,0.4)' }}>
                  {hasFilter ? 'Nenhum registro com esses filtros.' : 'Nenhum registro importado ainda.'}
                </p>
              </div>
            ) : (
              <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
                <p style={{ padding: '0.5rem 1rem', fontSize: '0.72rem', color: 'rgba(63,62,62,0.4)', borderBottom: '1px solid rgba(63,62,62,0.06)' }}>
                  {records.length} registro(s)
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(63,62,62,0.02)' }}>
                        {['Data SF', 'Importado em', 'Proprietário', 'Alias SF', 'Cliente', 'Descrição', 'Regra', 'Pontos', 'ID Salesforce'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r.id}>
                          <td style={tdStyle}>{r.sf_created_at ? format(new Date(r.sf_created_at), 'dd/MM/yy HH:mm', { locale: ptBR }) : dash}</td>
                          <td style={tdStyle}>{format(new Date(r.imported_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</td>
                          <td style={tdStyle}>{r.owner_name ?? dash}</td>
                          <td style={tdStyle}>
                            {r.sf_alias
                              ? <code style={{ fontSize: '0.72rem', background: 'rgba(141,178,60,0.1)', padding: '0.1rem 0.35rem', borderRadius: '0 0.25rem 0.25rem 0.25rem' }}>{r.sf_alias}</code>
                              : dash}
                          </td>
                          <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.account_name ?? dash}</td>
                          <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.65)' }}>{r.description ?? dash}</span>
                          </td>
                          <td style={{ ...tdStyle, fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)' }}>{r.scoring_rules?.name ?? dash}</td>
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                            {r.transaction_id
                              ? <span style={{ color: '#5C7435', fontWeight: 600, fontSize: '0.78rem' }}>✓ gerado</span>
                              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span style={{ color: 'rgba(63,62,62,0.35)', fontSize: '0.72rem' }}>sem match</span>
                                  <RematchButton recordId={r.id} />
                                </span>}
                          </td>
                          <td style={tdStyle}><code style={{ fontSize: '0.65rem', color: 'rgba(63,62,62,0.35)' }}>{r.sf_id}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'aliases' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', alignItems: 'start' }}>
            {/* Aliases sem match vindos do SF */}
            <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(63,62,62,0.08)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#3F3E3E' }}>Aliases do Salesforce sem match</span>
                {unmatched.length > 0 && (
                  <span style={{ fontSize: '0.7rem', background: 'rgba(220,53,69,0.1)', color: '#dc3545', padding: '0.1rem 0.45rem', borderRadius: '0 0.25rem 0.25rem 0.25rem', fontWeight: 600 }}>
                    {unmatched.filter(u => !u.matched).length} pendente(s)
                  </span>
                )}
              </div>
              {unmatched.length === 0 ? (
                <p style={{ padding: '2rem', textAlign: 'center', fontSize: '0.82rem', color: 'rgba(63,62,62,0.4)' }}>
                  Nenhum registro sem match. Tudo certo! ✓
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(63,62,62,0.02)' }}>
                      {['Alias SF', 'Proprietário', 'Qtd registros', 'Status'].map(h => (
                        <th key={h} style={{ padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(63,62,62,0.45)', borderBottom: '1px solid rgba(63,62,62,0.08)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {unmatched.map(row => (
                      <tr key={row.sf_alias}>
                        <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid rgba(63,62,62,0.05)' }}>
                          <code style={{ fontSize: '0.78rem', background: 'rgba(220,53,69,0.06)', color: '#dc3545', padding: '0.1rem 0.4rem', borderRadius: '0 0.25rem 0.25rem 0.25rem', fontWeight: 600 }}>{row.sf_alias}</code>
                        </td>
                        <td style={{ padding: '0.5rem 1rem', fontSize: '0.78rem', color: '#3F3E3E', borderBottom: '1px solid rgba(63,62,62,0.05)' }}>{row.owner_name ?? '—'}</td>
                        <td style={{ padding: '0.5rem 1rem', fontSize: '0.78rem', textAlign: 'center', color: 'rgba(63,62,62,0.6)', borderBottom: '1px solid rgba(63,62,62,0.05)' }}>{row.count}</td>
                        <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid rgba(63,62,62,0.05)' }}>
                          {row.matched
                            ? <span style={{ fontSize: '0.7rem', color: '#5C7435', fontWeight: 600 }}>✓ já pontuado</span>
                            : <span style={{ fontSize: '0.7rem', color: '#dc3545', fontWeight: 600 }}>⚠ sem usuário</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Usuários e seus sf_alias */}
            <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(63,62,62,0.08)' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#3F3E3E' }}>Alias configurado nos participantes</span>
              </div>
              <p style={{ padding: '0.6rem 1rem 0.4rem', fontSize: '0.72rem', color: 'rgba(63,62,62,0.45)' }}>
                Configure o alias em <strong>Usuários → Editar usuário → Alias Salesforce</strong>
              </p>
              {participantAliases.length === 0 ? (
                <p style={{ padding: '2rem', textAlign: 'center', fontSize: '0.82rem', color: 'rgba(63,62,62,0.4)' }}>Nenhum participante encontrado.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(63,62,62,0.02)' }}>
                      {['Participante', 'Alias SF'].map(h => (
                        <th key={h} style={{ padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(63,62,62,0.45)', borderBottom: '1px solid rgba(63,62,62,0.08)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {participantAliases.map(u => (
                      <tr key={u.id}>
                        <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid rgba(63,62,62,0.05)' }}>
                          <a href={`/manager/users/${u.id}`} style={{ fontSize: '0.78rem', color: '#8DB23C', textDecoration: 'none', fontWeight: 500 }}>{u.name} ↗</a>
                        </td>
                        <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid rgba(63,62,62,0.05)' }}>
                          {u.sf_alias
                            ? <code style={{ fontSize: '0.78rem', background: 'rgba(141,178,60,0.1)', color: '#5C7435', padding: '0.1rem 0.4rem', borderRadius: '0 0.25rem 0.25rem 0.25rem' }}>{u.sf_alias}</code>
                            : <span style={{ fontSize: '0.72rem', color: '#dc3545' }}>⚠ não configurado</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === 'log' && (
          <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
            {logs.length === 0 ? (
              <p style={{ padding: '3rem', textAlign: 'center', color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>
                Nenhum log ainda. Os logs aparecem após a primeira sincronização automática.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(63,62,62,0.02)' }}>
                      {['Data/Hora', 'Regra', 'Encontrados no SF', 'Inseridos', 'Ignorados', 'Status', 'Erros'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l.id}>
                        <td style={tdStyle}>
                          {new Date(l.triggered_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{l.rule_name || dash}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{l.sf_found}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ fontWeight: l.inserted > 0 ? 700 : 400, color: l.inserted > 0 ? '#5C7435' : 'rgba(63,62,62,0.4)' }}>
                            {l.inserted}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: 'rgba(63,62,62,0.5)' }}>{l.skipped}</td>
                        <td style={tdStyle}>
                          <span style={{
                            ...statusStyle[l.status],
                            fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem',
                            borderRadius: '0 0.3rem 0.3rem 0.3rem',
                          }}>
                            {statusLabel[l.status] ?? l.status}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, maxWidth: 300 }}>
                          {l.errors?.length > 0
                            ? <span style={{ fontSize: '0.72rem', color: '#dc3545' }}>{l.errors.join('; ')}</span>
                            : <span style={{ color: 'rgba(63,62,62,0.25)', fontSize: '0.72rem' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
