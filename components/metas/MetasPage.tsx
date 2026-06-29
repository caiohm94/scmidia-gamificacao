'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MetasMatrixTab } from './MetasMatrixTab'
import { RealizadoTab } from './RealizadoTab'

type Campaign = { id: string; name: string }
type Rule = { id: string; name: string; points: number; target_period: string | null; campaign_id: string; category: string; value_type: string; decimal_places: number; is_active: boolean }
type Participant = { id: string; name: string }

interface Props {
  campaigns: Campaign[]
  initialCampaignId: string
  initialRuleId: string
  initialMonth: string
  initialTab: string
}

const selectStyle = {
  border: '1px solid rgba(63,62,62,0.2)',
  borderRadius: '0 0.4rem 0.4rem 0.4rem',
  padding: '0.35rem 0.75rem',
  fontSize: '0.82rem',
  color: '#3F3E3E',
  background: '#fff',
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function prevMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function MetasPage({ campaigns, initialCampaignId, initialRuleId, initialMonth, initialTab }: Props) {
  const router = useRouter()
  const [campaignId, setCampaignId] = useState(initialCampaignId)
  const [ruleId, setRuleId] = useState(initialRuleId)
  const [month, setMonth] = useState(initialMonth || currentMonth())
  const [tab, setTab] = useState(initialTab || 'metas')

  const [rules, setRules] = useState<Rule[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loadingCampaign, setLoadingCampaign] = useState(false)

  // Fetch rules and participants when campaign changes
  useEffect(() => {
    if (!campaignId) { setRules([]); setParticipants([]); return }
    setLoadingCampaign(true)
    Promise.all([
      fetch(`/api/campaigns/${campaignId}/rules`).then(r => r.ok ? r.json() : []),
      fetch(`/api/campaigns/${campaignId}/participants`).then(r => r.ok ? r.json() : []),
    ]).then(([allRules, rawParticipants]) => {
      setRules((allRules as Rule[]).filter(r => r.category === 'goal' && r.is_active !== false))
      const ps: Participant[] = (rawParticipants as Array<{ user_id: string; users: { id: string; name: string } | null }>)
        .flatMap(p => p.users ? [{ id: p.users.id, name: p.users.name }] : [])
      setParticipants(ps)
      setLoadingCampaign(false)
    })
  }, [campaignId])

  const selectedRule = rules.find(r => r.id === ruleId)

  function handleCampaignChange(id: string) {
    setCampaignId(id)
    setRuleId('')
    router.replace(`/manager/metas?campaign_id=${id}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Selectors + Month nav */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
        <select value={campaignId} onChange={e => handleCampaignChange(e.target.value)} style={selectStyle}>
          <option value="">Selecione a campanha</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={ruleId}
          onChange={e => setRuleId(e.target.value)}
          style={selectStyle}
          disabled={!campaignId || loadingCampaign}
        >
          <option value="">{loadingCampaign ? 'Carregando...' : 'Selecione o indicador'}</option>
          {rules.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        {ruleId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <button onClick={() => setMonth(prevMonth(month))}
              style={{ background: 'none', border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.82rem', color: '#3F3E3E' }}>
              ←
            </button>
            <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-outfit, sans-serif)', color: '#3F3E3E', minWidth: 130, textAlign: 'center', textTransform: 'capitalize' }}>
              {monthLabel(month)}
            </span>
            <button onClick={() => setMonth(nextMonth(month))}
              style={{ background: 'none', border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.82rem', color: '#3F3E3E' }}>
              →
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {ruleId && (
        <>
          <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid rgba(63,62,62,0.08)' }}>
            {(['metas', 'realizado'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0.5rem 1rem', fontSize: '0.82rem',
                  fontFamily: 'var(--font-outfit, sans-serif)',
                  color: tab === t ? '#8DB23C' : 'rgba(63,62,62,0.5)',
                  borderBottom: tab === t ? '2px solid #8DB23C' : '2px solid transparent',
                  marginBottom: -2,
                  fontWeight: tab === t ? 600 : 400,
                  textTransform: 'capitalize',
                }}>
                {t === 'metas' ? 'Metas' : 'Realizado'}
              </button>
            ))}
          </div>

          {tab === 'metas' && (
            <MetasMatrixTab
              ruleId={ruleId}
              campaignId={campaignId}
              month={month}
              participants={participants}
              valueType={selectedRule?.value_type ?? 'number'}
              decimalPlaces={selectedRule?.decimal_places ?? 0}
            />
          )}
          {tab === 'realizado' && (
            <RealizadoTab
              ruleId={ruleId}
              campaignId={campaignId}
              participants={participants}
              valueType={selectedRule?.value_type ?? 'number'}
              decimalPlaces={selectedRule?.decimal_places ?? 0}
            />
          )}
        </>
      )}

      {!ruleId && campaignId && !loadingCampaign && (
        <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Selecione um indicador para ver as metas.</p>
      )}
      {!campaignId && (
        <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Selecione uma campanha para começar.</p>
      )}
    </div>
  )
}
