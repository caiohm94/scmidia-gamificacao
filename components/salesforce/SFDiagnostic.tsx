'use client'
import { useState } from 'react'

type Rule = { id: string; name: string; sf_soql: string | null; sf_frequency: string | null; sf_alias_field: string | null }

interface Props { rules: Rule[] }

type ConnStatus = { ok: boolean; orgName?: string; error?: string } | null
type SyncResult = { rule_name: string; inserted: number; skipped: number; already_existing: number; errors: string[] }
type DebugResult = {
  rule: { id: string; name: string; sf_soql: string; sf_alias_field: string }
  participants: { id: string; name: string; sf_alias: string | null }[]
  sf_row_count: number
  sf_aliases: { sf_id: string; alias_raw: unknown; owner_name: unknown }[]
  soql_error: string | null
} | null

export function SFDiagnostic({ rules }: Props) {
  const [connStatus, setConnStatus] = useState<ConnStatus>(null)
  const [connLoading, setConnLoading] = useState(false)

  const [syncing, setSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const [debugRuleId, setDebugRuleId] = useState(rules[0]?.id ?? '')
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugResult, setDebugResult] = useState<DebugResult>(null)

  async function testConnection() {
    setConnLoading(true)
    setConnStatus(null)
    try {
      const res = await fetch('/api/integrations/salesforce/test-connection')
      const data = await res.json()
      setConnStatus(data)
    } catch { setConnStatus({ ok: false, error: 'Erro de rede' }) }
    setConnLoading(false)
  }

  async function syncNow() {
    setSyncing(true)
    setSyncResults(null)
    setSyncError(null)
    try {
      const res = await fetch('/api/integrations/salesforce/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (!res.ok) { setSyncError(`HTTP ${res.status}: ${await res.text()}`); setSyncing(false); return }
      const { results } = await res.json()
      setSyncResults(results ?? [])
    } catch (e) { setSyncError(String(e)) }
    setSyncing(false)
  }

  async function runDebug() {
    if (!debugRuleId) return
    setDebugLoading(true)
    setDebugResult(null)
    try {
      const res = await fetch(`/api/integrations/salesforce/debug?rule_id=${debugRuleId}`)
      setDebugResult(await res.json())
    } catch { setDebugResult(null) }
    setDebugLoading(false)
  }

  const card: React.CSSProperties = { background: '#fff', border: '1px solid rgba(63,62,62,0.1)', borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '1.25rem' }
  const label: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 700, color: 'rgba(63,62,62,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }
  const btn = (color = '#8DB23C'): React.CSSProperties => ({
    background: color, color: '#fff', border: 'none', borderRadius: '0 0.4rem 0.4rem 0.4rem',
    padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font-outfit)', opacity: 1,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Step 1: Connection test */}
      <div style={card}>
        <p style={label}>1. Testar conexão Salesforce</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={testConnection} disabled={connLoading} style={{ ...btn(), opacity: connLoading ? 0.6 : 1 }}>
            {connLoading ? 'Testando...' : 'Testar Conexão'}
          </button>
          {connStatus && (
            <span style={{
              fontSize: '0.82rem', fontWeight: 600, padding: '0.3rem 0.75rem',
              borderRadius: '0 0.4rem 0.4rem 0.4rem',
              background: connStatus.ok ? 'rgba(92,116,53,0.1)' : 'rgba(220,53,69,0.1)',
              color: connStatus.ok ? '#5C7435' : '#dc3545',
            }}>
              {connStatus.ok ? `✓ Conectado — ${connStatus.orgName}` : `✗ Erro: ${connStatus.error}`}
            </span>
          )}
        </div>
        {!connStatus && (
          <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.4)', marginTop: '0.5rem' }}>
            Se falhar → verifique <code style={{ fontSize: '0.72rem' }}>SFDC_INSTANCE_URL</code>, <code style={{ fontSize: '0.72rem' }}>SFDC_CLIENT_ID</code>, <code style={{ fontSize: '0.72rem' }}>SFDC_CLIENT_SECRET</code> no Vercel.
          </p>
        )}
      </div>

      {/* Step 2: Manual sync */}
      <div style={card}>
        <p style={label}>2. Sincronizar todos os indicadores agora</p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <button onClick={syncNow} disabled={syncing} style={{ ...btn('#3F3E3E'), opacity: syncing ? 0.6 : 1 }}>
            {syncing ? '⏳ Sincronizando...' : '⚡ Sync Agora'}
          </button>
          <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.4)', margin: 0 }}>
            Usa a sua sessão de gestor — não precisa do CRON_SECRET.
          </p>
        </div>

        {syncError && (
          <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(220,53,69,0.08)', borderRadius: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.78rem', color: '#dc3545' }}>
            Erro: {syncError}
          </div>
        )}

        {syncResults && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {syncResults.length === 0 && (
              <p style={{ fontSize: '0.82rem', color: '#8B6914' }}>
                ⚠ Nenhuma regra com frequência "5 min" ativa. Configure a frequência da regra no SF para "5 min" ou use o botão de sync individual.
              </p>
            )}
            {syncResults.map((r, i) => (
              <div key={i} style={{
                padding: '0.6rem 1rem', borderRadius: '0 0.5rem 0.5rem 0.5rem',
                background: r.inserted > 0 ? 'rgba(92,116,53,0.08)' : r.errors.length > 0 ? 'rgba(220,53,69,0.08)' : 'rgba(63,62,62,0.04)',
                border: `1px solid ${r.inserted > 0 ? 'rgba(92,116,53,0.2)' : r.errors.length > 0 ? 'rgba(220,53,69,0.2)' : 'rgba(63,62,62,0.08)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#3F3E3E' }}>{r.rule_name}</span>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
                    <span style={{ color: '#5C7435', fontWeight: 700 }}>✓ {r.inserted} inseridos</span>
                    <span style={{ color: 'rgba(63,62,62,0.5)' }}>{r.skipped} ignorados</span>
                    <span style={{ color: 'rgba(63,62,62,0.35)' }}>{r.already_existing} já existiam</span>
                  </div>
                </div>
                {r.errors.length > 0 && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.73rem', color: '#dc3545' }}>
                    {r.errors.map((e, j) => <div key={j}>• {e}</div>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 3: Debug SOQL */}
      <div style={card}>
        <p style={label}>3. Diagnóstico de regra — ver o que o Salesforce retorna</p>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <select value={debugRuleId} onChange={e => setDebugRuleId(e.target.value)}
            style={{ border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.4rem 0.7rem', fontSize: '0.82rem', color: '#3F3E3E' }}>
            {rules.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button onClick={runDebug} disabled={debugLoading || !debugRuleId} style={{ ...btn('#8DB23C'), opacity: debugLoading ? 0.6 : 1 }}>
            {debugLoading ? 'Executando...' : 'Executar SOQL'}
          </button>
        </div>

        {debugResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* SOQL */}
            <div>
              <p style={{ ...label, marginBottom: '0.3rem' }}>SOQL executado</p>
              <pre style={{ fontSize: '0.72rem', background: 'rgba(63,62,62,0.04)', padding: '0.6rem 0.9rem', borderRadius: '0 0.4rem 0.4rem 0.4rem', overflowX: 'auto', margin: 0, color: '#3F3E3E', whiteSpace: 'pre-wrap' }}>
                {debugResult.rule?.sf_soql ?? '—'}
              </pre>
            </div>

            {debugResult.soql_error && (
              <div style={{ padding: '0.6rem 0.9rem', background: 'rgba(220,53,69,0.08)', borderRadius: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.78rem', color: '#dc3545' }}>
                ✗ Erro SOQL: {debugResult.soql_error}
              </div>
            )}

            {!debugResult.soql_error && (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3F3E3E' }}>
                  📋 {debugResult.sf_row_count} registros no Salesforce
                </span>
                <span style={{ fontSize: '0.82rem', color: '#3F3E3E' }}>
                  Campo alias: <code style={{ background: 'rgba(141,178,60,0.1)', padding: '0.1rem 0.35rem', borderRadius: '0.2rem', fontSize: '0.72rem' }}>{debugResult.rule?.sf_alias_field}</code>
                </span>
              </div>
            )}

            {/* SF aliases vs participantes */}
            {debugResult.sf_row_count > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* SF aliases encontrados */}
                <div>
                  <p style={{ ...label, marginBottom: '0.4rem' }}>Aliases encontrados no SF ({debugResult.sf_aliases.length})</p>
                  <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid rgba(63,62,62,0.1)', borderRadius: '0 0.4rem 0.4rem 0.4rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(63,62,62,0.04)' }}>
                          <th style={{ padding: '0.35rem 0.6rem', textAlign: 'left', color: 'rgba(63,62,62,0.5)', fontWeight: 600 }}>Alias (do SF)</th>
                          <th style={{ padding: '0.35rem 0.6rem', textAlign: 'left', color: 'rgba(63,62,62,0.5)', fontWeight: 600 }}>Proprietário</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debugResult.sf_aliases.slice(0, 50).map((a, i) => {
                          const aliasStr = String(a.alias_raw ?? '')
                          const matched = debugResult.participants?.some(p => p.sf_alias === aliasStr)
                          return (
                            <tr key={i} style={{ borderTop: '1px solid rgba(63,62,62,0.06)', background: matched ? 'rgba(92,116,53,0.05)' : undefined }}>
                              <td style={{ padding: '0.3rem 0.6rem' }}>
                                <code style={{ fontSize: '0.72rem', color: matched ? '#5C7435' : '#dc3545', fontWeight: 600 }}>
                                  {aliasStr || '(vazio)'}
                                </code>
                                {matched && <span style={{ fontSize: '0.65rem', color: '#5C7435', marginLeft: '0.3rem' }}>✓</span>}
                              </td>
                              <td style={{ padding: '0.3rem 0.6rem', color: 'rgba(63,62,62,0.6)' }}>{String(a.owner_name ?? '—')}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Participantes e seus aliases */}
                <div>
                  <p style={{ ...label, marginBottom: '0.4rem' }}>Aliases configurados nos participantes</p>
                  <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid rgba(63,62,62,0.1)', borderRadius: '0 0.4rem 0.4rem 0.4rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(63,62,62,0.04)' }}>
                          <th style={{ padding: '0.35rem 0.6rem', textAlign: 'left', color: 'rgba(63,62,62,0.5)', fontWeight: 600 }}>Participante</th>
                          <th style={{ padding: '0.35rem 0.6rem', textAlign: 'left', color: 'rgba(63,62,62,0.5)', fontWeight: 600 }}>sf_alias</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(debugResult.participants ?? []).map(p => {
                          const hasAlias = !!p.sf_alias
                          const foundInSF = hasAlias && debugResult.sf_aliases.some(a => String(a.alias_raw ?? '') === p.sf_alias)
                          return (
                            <tr key={p.id} style={{ borderTop: '1px solid rgba(63,62,62,0.06)' }}>
                              <td style={{ padding: '0.3rem 0.6rem', fontWeight: 500, color: '#3F3E3E' }}>{p.name}</td>
                              <td style={{ padding: '0.3rem 0.6rem' }}>
                                {hasAlias
                                  ? <code style={{ fontSize: '0.72rem', color: foundInSF ? '#5C7435' : '#8B6914', fontWeight: 600 }}>
                                      {p.sf_alias} {foundInSF ? '✓' : '⚠ não encontrado no SF'}
                                    </code>
                                  : <span style={{ fontSize: '0.7rem', color: '#dc3545' }}>⚠ não configurado</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Diagnóstico resumido */}
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(63,62,62,0.03)', borderRadius: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.78rem', color: '#3F3E3E' }}>
              <p style={{ fontWeight: 700, margin: '0 0 0.4rem' }}>📊 Diagnóstico:</p>
              {debugResult.soql_error && <p style={{ margin: '0.15rem 0', color: '#dc3545' }}>✗ SOQL com erro — verifique as credenciais SF e a query.</p>}
              {!debugResult.soql_error && debugResult.sf_row_count === 0 && <p style={{ margin: '0.15rem 0', color: '#8B6914' }}>⚠ SOQL retornou 0 registros — ajuste o filtro da query.</p>}
              {!debugResult.soql_error && debugResult.sf_row_count > 0 && (() => {
                const sfAliases = new Set(debugResult.sf_aliases.map(a => String(a.alias_raw ?? '').trim()).filter(Boolean))
                const participantsWithAlias = (debugResult.participants ?? []).filter(p => p.sf_alias)
                const matched = participantsWithAlias.filter(p => sfAliases.has(p.sf_alias!))
                const noAlias = (debugResult.participants ?? []).filter(p => !p.sf_alias)
                return (
                  <>
                    {noAlias.length > 0 && <p style={{ margin: '0.15rem 0', color: '#dc3545' }}>✗ {noAlias.length} participante(s) sem sf_alias configurado: {noAlias.map(p => p.name).join(', ')}</p>}
                    {participantsWithAlias.length > 0 && matched.length === 0 && <p style={{ margin: '0.15rem 0', color: '#dc3545' }}>✗ Nenhum alias dos participantes bate com os aliases do SF. Verifique o campo alias ({debugResult.rule?.sf_alias_field}).</p>}
                    {matched.length > 0 && <p style={{ margin: '0.15rem 0', color: '#5C7435' }}>✓ {matched.length} participante(s) com alias correspondente no SF — pronto para importar.</p>}
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
