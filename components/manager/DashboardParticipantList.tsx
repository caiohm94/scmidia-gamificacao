// components/manager/DashboardParticipantList.tsx
'use client'
import { useState, useCallback } from 'react'
import { ParticipantDrawer } from './ParticipantDrawer'

export type ParticipantRow = {
  user_id: string; name: string; avatar_url: string | null
  position: number; total_points: number; current_streak: number
  team_name: string | null; team_color: string | null; function: string | null
  goals: { rule_name: string; actual: number; target: number }[]
}

interface Props {
  participants: ParticipantRow[]
  campaignId: string
}

const MEDALS = ['🥇', '🥈', '🥉']
const FUNCTION_LABEL: Record<string, string> = {
  internal_seller: 'Vendedor Interno',
  external_seller: 'Vendedor Externo',
  hunter: 'Hunter',
  manager: 'Gestor',
  auditor: 'Auditor',
}

export function DashboardParticipantList({ participants, campaignId }: Props) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const handleClose = useCallback(() => setSelectedUserId(null), [])

  if (participants.length === 0) {
    return (
      <div className="sc-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'rgba(63,62,62,0.4)' }}>Nenhum participante nesta campanha.</p>
      </div>
    )
  }

  return (
    <>
      <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
        {participants.map((p, i) => (
          <ParticipantListRow
            key={p.user_id}
            row={p}
            isLast={i === participants.length - 1}
            isSelected={selectedUserId === p.user_id}
            onClick={() => setSelectedUserId(prev => prev === p.user_id ? null : p.user_id)}
          />
        ))}
      </div>
      <ParticipantDrawer userId={selectedUserId} campaignId={campaignId} onClose={handleClose} />
    </>
  )
}

function ListAvatar({ src, name }: { src: string | null; name: string }) {
  const [err, setErr] = useState(false)
  const size = 44
  const base: React.CSSProperties = { width: size, height: size, borderRadius: '0 0.55rem 0.55rem 0.55rem', flexShrink: 0, overflow: 'hidden', border: '1.5px solid rgba(141,178,60,0.22)' }
  const initial = name?.charAt(0)?.toUpperCase() ?? '?'
  if (src && !err) return (
    <div style={base}>
      <img src={src} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
    </div>
  )
  return (
    <div style={{ ...base, background: 'linear-gradient(135deg,#8DB23C,#5C7435)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
      {initial}
    </div>
  )
}

function MiniGoalBar({ actual, target }: { actual: number; target: number }) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0
  const color = pct >= 100 ? '#8DB23C' : pct >= 75 ? '#FFDF00' : pct > 0 ? '#ef4444' : 'rgba(63,62,62,0.12)'
  return (
    <div style={{ width: 56, height: 5, background: 'rgba(63,62,62,0.1)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  )
}

function ParticipantListRow({ row, isLast, isSelected, onClick }: { row: ParticipantRow; isLast: boolean; isSelected: boolean; onClick: () => void }) {
  const isFirst = row.position === 1
  const isTop3 = row.position <= 3

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.65rem 1rem',
        borderBottom: isLast ? 'none' : '1px solid rgba(63,62,62,0.06)',
        borderLeft: isSelected ? '3px solid #8DB23C' : isFirst ? '3px solid rgba(255,223,0,0.45)' : '3px solid transparent',
        background: isSelected ? 'rgba(141,178,60,0.07)' : isFirst ? 'rgba(255,223,0,0.04)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {/* Position */}
      <div style={{ width: 30, textAlign: 'center', flexShrink: 0 }}>
        {isTop3
          ? <span style={{ fontSize: '1.05rem' }}>{MEDALS[row.position - 1]}</span>
          : <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(63,62,62,0.32)' }}>{row.position}</span>}
      </div>

      {/* Avatar */}
      <ListAvatar src={row.avatar_url} name={row.name} />

      {/* Name + team/function */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#3F3E3E', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</p>
        <div style={{ marginTop: '0.2rem' }}>
          {row.team_name ? (
            <span style={{ fontSize: '0.63rem', padding: '0.05rem 0.4rem', borderRadius: '0 0.2rem 0.2rem 0.2rem', background: (row.team_color ?? '#8DB23C') + '20', color: row.team_color ?? '#8DB23C', fontWeight: 600 }}>
              {row.team_name}
            </span>
          ) : row.function ? (
            <span style={{ fontSize: '0.63rem', color: 'rgba(63,62,62,0.38)' }}>{FUNCTION_LABEL[row.function] ?? row.function}</span>
          ) : null}
        </div>
      </div>

      {/* Points */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <p style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 700, fontSize: isFirst ? '1.05rem' : '0.9rem', color: '#8DB23C', margin: 0 }}>
          {row.total_points.toLocaleString('pt-BR')}
        </p>
        <p style={{ fontSize: '0.58rem', color: 'rgba(63,62,62,0.32)', margin: 0 }}>pts</p>
      </div>

      {/* Streak */}
      {row.current_streak > 0 && (
        <div style={{ flexShrink: 0, fontSize: '0.73rem', color: '#f97316', fontWeight: 600 }}>🔥{row.current_streak}</div>
      )}

      {/* Mini goal bars */}
      {row.goals.length > 0 && (
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {row.goals.slice(0, 2).map((g, i) => <MiniGoalBar key={i} actual={g.actual} target={g.target} />)}
        </div>
      )}

      {/* Chevron */}
      <div style={{ flexShrink: 0, color: isSelected ? '#8DB23C' : 'rgba(63,62,62,0.2)', fontSize: '1rem', transition: 'color 0.15s' }}>›</div>
    </div>
  )
}
