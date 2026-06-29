'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MetasMatrixTab } from './MetasMatrixTab'
import { RealizadoTab } from './RealizadoTab'

type Campaign = { id: string; name: string }
type Rule = { id: string; name: string; points: number; target_period: string | null; campaign_id: string }
type Participant = { id: string; name: string }

interface Props {
  campaigns: Campaign[]
  rules: Rule[]
  participants: Participant[]
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

export function MetasPage({ campaigns, rules, participants, initialCampaignId, initialRuleId, initialMonth, initialTab }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [campaignId, setCampaignId] = useState(initialCampaignId)
  const [ruleId, setRuleId] = useState(initialRuleId)
  const [month, setMonth] = useState(initialMonth || currentMonth())
  const [tab, setTab] = useState(initialTab || 'metas')

  const selectedRule = rules.find(r => r.id === ruleId)

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams({ campaign_id: campaignId, rule_id: ruleId, month, tab, ...params })
    startTransition(() => router.replace(`/manager/metas?${sp.toString()}`))
  }

  function handleCampaignChange(id: string) {
    setCampaignId(id)
    setRuleId('')
    navigate({ campaign_id: id, rule_id: '' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Selectors + Month nav */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
        <select value={campaignId} onChange={e => handleCampaignChange(e.target.value)} style={selectStyle}>
          <option value="">Selecione a campanha</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={ruleId} onChange={e => { setRuleId(e.target.value); navigate({ rule_id: e.target.value }) }} style={selectStyle} disabled={!campaignId}>
          <option value="">Selecione o indicador</option>
          {rules.filter(r => r.campaign_id === campaignId).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        {ruleId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <button onClick={() => { const m = prevMonth(month); setMonth(m); navigate({ month: m }) }}
              style={{ background: 'none', border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.82rem', color: '#3F3E3E' }}>
              ←
            </button>
            <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-outfit, sans-serif)', color: '#3F3E3E', minWidth: 130, textAlign: 'center', textTransform: 'capitalize' }}>
              {monthLabel(month)}
            </span>
            <button onClick={() => { const m = nextMonth(month); setMonth(m); navigate({ month: m }) }}
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
              <button key={t} onClick={() => { setTab(t); navigate({ tab: t }) }}
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
            />
          )}
          {tab === 'realizado' && (
            <RealizadoTab
              ruleId={ruleId}
              campaignId={campaignId}
              month={month}
              participants={participants}
              rule={selectedRule!}
            />
          )}
        </>
      )}

      {!ruleId && campaignId && (
        <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Selecione um indicador para ver as metas.</p>
      )}
      {!campaignId && (
        <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Selecione uma campanha para começar.</p>
      )}
    </div>
  )
}
