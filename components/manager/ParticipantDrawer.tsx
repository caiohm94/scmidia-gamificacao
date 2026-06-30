'use client'
import { useEffect, useState, useCallback } from 'react'
import { GoalProgressBar } from '@/components/participant/GoalProgressBar'
import { PointsHistory, type PointEntry } from '@/components/participant/PointsHistory'
import { LevelBadge } from '@/components/game/LevelBadge'
import { StreakBadge } from '@/components/game/StreakBadge'
import { X } from 'lucide-react'

type GoalItem = {
  id: string; rule_name: string; actual_value: number; target_value: number
  value_type: string; decimal_places: number; target_period: string | null; is_cumulative: boolean
}

type DrawerData = {
  name: string; avatar_url: string | null; total_points: number
  position: number | null; current_streak: number
  level: { name: string; badge_icon: string; color: string } | null
  goals: GoalItem[]
  recentPoints: PointEntry[]
}

interface Props {
  userId: string | null
  campaignId: string
  onClose: () => void
}

export function ParticipantDrawer({ userId, campaignId, onClose }: Props) {
  const [data, setData] = useState<DrawerData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchDetails = useCallback(async (uid: string) => {
    setLoading(true)
    setData(null)
    try {
      const res = await fetch(`/api/manager/participant-details/${uid}?campaign_id=${campaignId}`)
      if (res.ok) setData(await res.json() as DrawerData)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    if (userId) fetchDetails(userId)
    else setData(null)
  }, [userId, fetchDetails])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const open = !!userId

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40,
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 250ms ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(420px, 100vw)',
        background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.14)',
        zIndex: 50, transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 250ms ease', display: 'flex', flexDirection: 'column',
        borderRadius: '0.75rem 0 0 0.75rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(63,62,62,0.08)' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(63,62,62,0.45)', padding: '0.25rem', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {loading && <DrawerSkeleton />}

          {!loading && data && (
            <>
              {/* Hero */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                <DrawerAvatar src={data.avatar_url} name={data.name} size={80} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 800, fontSize: '1.15rem', color: '#3F3E3E', margin: 0, lineHeight: 1.2 }}>
                    {data.name}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                    {data.level && <LevelBadge name={data.level.name} icon={data.level.badge_icon} color={data.level.color} />}
                    <StreakBadge streak={data.current_streak} />
                  </div>
                </div>
              </div>

              {/* 3 Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <DrawerStat label="pontos ⚽" value={data.total_points.toLocaleString('pt-BR')} highlight="#8DB23C" />
                <DrawerStat label="ranking 🏆" value={data.position != null ? `#${data.position}` : '—'} />
                <DrawerStat label="sequência 🔥" value={String(data.current_streak)} highlight={data.current_streak > 0 ? '#f97316' : undefined} />
              </div>

              {/* Goals */}
              {data.goals.length > 0 && (
                <section style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(63,62,62,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Metas</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {data.goals.map(g => (
                      <GoalProgressBar
                        key={g.id}
                        label={g.rule_name}
                        actual={g.actual_value}
                        target={g.target_value}
                        valueType={g.value_type}
                        decimalPlaces={g.decimal_places}
                        periodLabel={g.is_cumulative ? 'Acumulado' : g.target_period === 'monthly' ? 'Mensal' : 'Hoje'}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Recent points */}
              <section style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(63,62,62,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Últimos pontos</p>
                <div style={{ borderRadius: '0 0.5rem 0.5rem 0.5rem', border: '1px solid rgba(63,62,62,0.08)', overflow: 'hidden' }}>
                  <PointsHistory points={data.recentPoints} />
                </div>
              </section>

              {/* Link to full preview */}
              <a
                href={`/manager/preview/${userId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', textAlign: 'center', padding: '0.65rem', borderRadius: '0 0.5rem 0.5rem 0.5rem', border: '1px solid rgba(141,178,60,0.4)', color: '#8DB23C', fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}
              >
                Ver painel completo ↗
              </a>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function DrawerAvatar({ src, name, size }: { src: string | null; name: string; size: number }) {
  const [err, setErr] = useState(false)
  const initial = name?.charAt(0)?.toUpperCase() ?? '?'
  const base: React.CSSProperties = { width: size, height: size, borderRadius: '0 0.75rem 0.75rem 0.75rem', flexShrink: 0, overflow: 'hidden', border: '2px solid rgba(141,178,60,0.3)' }
  if (src && !err) return (
    <div style={base}>
      <img src={src} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
    </div>
  )
  return (
    <div style={{ ...base, background: 'linear-gradient(135deg,#8DB23C,#5C7435)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
      {initial}
    </div>
  )
}

function DrawerStat({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.65rem 0.4rem', borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(63,62,62,0.04)', border: '1px solid rgba(63,62,62,0.08)' }}>
      <p style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-outfit, sans-serif)', color: highlight ?? '#3F3E3E', lineHeight: 1, margin: 0 }}>{value}</p>
      <p style={{ fontSize: '0.6rem', color: 'rgba(63,62,62,0.45)', marginTop: '0.2rem', margin: '0.2rem 0 0' }}>{label}</p>
    </div>
  )
}

function DrawerSkeleton() {
  const pulse: React.CSSProperties = { background: 'rgba(63,62,62,0.08)', borderRadius: 6, animation: 'skpulse 1.5s ease-in-out infinite' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style>{`@keyframes skpulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ ...pulse, width: 80, height: 80, borderRadius: '0 0.75rem 0.75rem 0.75rem' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ ...pulse, height: 20, width: '60%' }} />
          <div style={{ ...pulse, height: 14, width: '40%' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' }}>
        {[1, 2, 3].map(i => <div key={i} style={{ ...pulse, height: 60 }} />)}
      </div>
      {[80, 65, 75, 55].map((w, i) => <div key={i} style={{ ...pulse, height: 12, width: `${w}%` }} />)}
    </div>
  )
}
