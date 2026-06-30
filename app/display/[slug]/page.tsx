'use client'
import { useEffect, useState, Suspense, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CelebrationOverlay } from '@/components/game/CelebrationOverlay'
import type { CampaignRanking } from '@/types/database'
import Image from 'next/image'

const ROTATION_INTERVAL = 15000
const VIEWS = ['ranking', 'top3', 'feed'] as const
type View = (typeof VIEWS)[number]

type CampaignRow = { id: string; name: string; slug: string; display_token: string; ends_at: string | null; theme: Record<string, string> }
type FeedEventRow = { id: string; event_type: string; payload: Record<string, unknown>; created_at: string; user_id: string }
type CelebrationData = { user_id: string; points: number; rule_name: string; message: string; avatar_url?: string; user_name?: string }

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');

* { box-sizing: border-box; }

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.88); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes glow1 {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,223,0,0); }
  50%       { box-shadow: 0 0 28px 6px rgba(255,223,0,0.18); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
@keyframes progressBar {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes countBounce {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}
@keyframes spin { to { transform: rotate(360deg) } }
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}

.row-enter { animation: fadeSlideIn 0.45s ease both; }
.view-enter { animation: fadeSlideUp 0.5s cubic-bezier(.22,.68,0,1.2) both; }
.scale-enter { animation: scaleIn 0.55s cubic-bezier(.22,.68,0,1.2) both; }
`

// --- Avatar ---
function TVAvatar({ src, name, size = 56, glowing = false }: { src?: string | null; name: string; size?: number; glowing?: boolean }) {
  const [err, setErr] = useState(false)
  const initial = name?.charAt(0)?.toUpperCase() ?? '?'
  const border = glowing ? '3px solid #FFDF00' : '2px solid rgba(141,178,60,0.35)'
  const shadow = glowing ? '0 0 20px 4px rgba(255,223,0,0.3)' : 'none'
  const style = { width: size, height: size, borderRadius: '0 0.75rem 0.75rem 0.75rem', flexShrink: 0, border, boxShadow: shadow, objectFit: 'cover' as const, transition: 'box-shadow 0.4s' }

  if (src && !err) return <img src={src} alt={name} onError={() => setErr(true)} style={style} />
  return (
    <div style={{
      ...style, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #8DB23C, #5C7435)',
      fontSize: size * 0.38, fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif',
    }}>{initial}</div>
  )
}

// --- Progress bar ---
function ProgressBar({ duration, key: k }: { duration: number; key: number }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.05)' }}>
      <div style={{
        height: '100%', background: 'linear-gradient(90deg, #8DB23C, #BACB3A)',
        transformOrigin: 'left', animation: `progressBar ${duration}ms linear both`,
      }} />
    </div>
  )
}

// --- Clock ---
function Clock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [])
  return <span>{time}</span>
}

// --- Ranking view ---
function RankingView({ rows, viewKey }: { rows: CampaignRanking[]; viewKey: number }) {
  return (
    <div className="view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.2rem' }}>🏆</span>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8DB23C', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>
          Classificação Geral
        </p>
      </div>
      {rows.slice(0, 10).map((row, i) => {
        const isFirst = row.position === 1
        const isTop3 = row.position <= 3
        const delay = `${i * 60}ms`
        const posColors = ['#FFDF00', '#C0C0C0', '#CD7F32']
        const ptColor = isTop3 ? posColors[row.position - 1] : '#8DB23C'

        return (
          <div
            key={row.user_id}
            className="row-enter"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.9rem',
              padding: '0.55rem 0.9rem',
              background: isFirst
                ? 'rgba(255,223,0,0.07)'
                : isTop3 ? 'rgba(141,178,60,0.07)' : 'rgba(255,255,255,0.025)',
              borderRadius: '0 0.55rem 0.55rem 0.55rem',
              border: isFirst
                ? '1px solid rgba(255,223,0,0.2)'
                : isTop3 ? '1px solid rgba(141,178,60,0.15)' : '1px solid rgba(255,255,255,0.04)',
              animationDelay: delay,
              animation: `fadeSlideIn 0.45s ease ${delay} both`,
              ...(isFirst ? { boxShadow: '0 0 0 0 rgba(255,223,0,0.2)', animationName: 'glow1', animationDuration: '2.5s', animationIterationCount: 'infinite' } : {}),
            }}
          >
            {/* Position */}
            <div style={{ width: 34, textAlign: 'center', flexShrink: 0 }}>
              {row.position <= 3
                ? <span style={{ fontSize: '1.3rem' }}>{['🥇','🥈','🥉'][row.position-1]}</span>
                : <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit, sans-serif' }}>{row.position}</span>
              }
            </div>

            <TVAvatar src={row.avatar_url} name={row.name} size={isTop3 ? 46 : 40} glowing={isFirst} />

            {/* Name + team */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: isTop3 ? 700 : 600,
                fontSize: isTop3 ? '1rem' : '0.9rem', color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{row.name}</p>
              {row.team_name && (
                <span style={{
                  fontSize: '0.65rem', padding: '0.05rem 0.45rem', borderRadius: '0 0.2rem 0.2rem 0.2rem',
                  background: (row.team_color ?? '#8DB23C') + '25', color: row.team_color ?? '#8DB23C',
                  fontWeight: 600, fontFamily: 'Outfit, sans-serif',
                }}>{row.team_name}</span>
              )}
            </div>

            {/* Points */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 900,
                fontSize: isTop3 ? '1.4rem' : '1.1rem', color: ptColor, lineHeight: 1,
              }}>{row.total_points.toLocaleString('pt-BR')}</p>
              <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>pts</p>
            </div>

            {row.current_streak > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#FF8C00', flexShrink: 0 }}>🔥{row.current_streak}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// --- Podium ---
function PodiumView({ top3, viewKey }: { top3: CampaignRanking[]; viewKey: number }) {
  const order = [top3[1], top3[0], top3[2]]
  const heights = [240, 310, 200]
  const photoSizes = [96, 128, 86]
  const medals = ['🥈','🥇','🥉']
  const accentColors = ['#C0C0C0','#FFDF00','#CD7F32']
  const delays = ['0.15s','0s','0.3s']

  return (
    <div className="view-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2.5rem', animation: 'slideDown 0.5s ease both' }}>
        <span style={{ fontSize: '1.3rem' }}>🏆</span>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8DB23C', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>
          Pódio — Top 3
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2rem' }}>
        {order.map((row, i) => {
          if (!row) return <div key={i} style={{ width: 180 }} />
          const isCenter = i === 1
          return (
            <div key={row.user_id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', width: 180,
              animation: `scaleIn 0.6s cubic-bezier(.22,.68,0,1.2) ${delays[i]} both`,
            }}>
              {/* Photo */}
              <div style={{
                position: 'relative', marginBottom: '0.65rem',
                ...(isCenter ? { animation: 'float 3s ease-in-out 1s infinite' } : {}),
              }}>
                <TVAvatar src={row.avatar_url} name={row.name} size={photoSizes[i]} glowing={isCenter} />
                <span style={{
                  position: 'absolute', bottom: -8, right: -8,
                  fontSize: photoSizes[i] * 0.3, lineHeight: 1,
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
                }}>{medals[i]}</span>
              </div>

              <p style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: isCenter ? '1.1rem' : '0.92rem', color: '#fff',
                textAlign: 'center', marginBottom: '0.3rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
              }}>{row.name}</p>

              {row.team_name && (
                <span style={{
                  fontSize: '0.62rem', padding: '0.05rem 0.45rem', borderRadius: '0 0.2rem 0.2rem 0.2rem',
                  background: (row.team_color ?? '#8DB23C') + '25', color: row.team_color ?? '#8DB23C',
                  fontWeight: 600, fontFamily: 'Outfit, sans-serif', marginBottom: '0.4rem',
                }}>{row.team_name}</span>
              )}

              <p style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 900,
                fontSize: isCenter ? '2.1rem' : '1.6rem',
                color: accentColors[i], lineHeight: 1, marginBottom: '0.15rem',
              }}>{row.total_points.toLocaleString('pt-BR')}</p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem' }}>pontos</p>

              {/* Podium block */}
              <div style={{
                width: '100%', height: heights[i],
                background: `linear-gradient(to top, ${accentColors[i]}28, ${accentColors[i]}08)`,
                borderRadius: '0.5rem 0.5rem 0 0',
                border: `1px solid ${accentColors[i]}28`, borderBottom: 'none',
              }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- Feed ---
const feedIcons: Record<string, string> = {
  point_earned: '⚽', level_up: '🏅', bonus_earned: '⭐',
  streak_milestone: '🔥', ranking_change: '📈', campaign_start: '🚀', campaign_end: '🏁',
}
const feedLabels: Record<string, string> = {
  point_earned: 'marcou', level_up: 'subiu de nível!', bonus_earned: 'conquistou bônus!',
  streak_milestone: 'em sequência!', ranking_change: 'subiu no ranking!',
}

function FeedView({ events, viewKey }: { events: FeedEventRow[]; viewKey: number }) {
  return (
    <div className="view-enter" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.2rem', animation: 'pulse 1.5s ease-in-out infinite' }}>📡</span>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8DB23C', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>
          Feed ao Vivo
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {events.slice(0, 7).map((ev, i) => {
          const p = ev.payload as Record<string, unknown>
          return (
            <div key={ev.id} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '0.85rem 1.1rem',
              background: i === 0 ? 'rgba(141,178,60,0.1)' : 'rgba(255,255,255,0.025)',
              borderRadius: '0 0.6rem 0.6rem 0.6rem',
              border: i === 0 ? '1px solid rgba(141,178,60,0.25)' : '1px solid rgba(255,255,255,0.04)',
              opacity: Math.max(0.35, 1 - i * 0.1),
              animation: `fadeSlideIn 0.4s ease ${i * 70}ms both`,
            }}>
              <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>{feedIcons[ev.event_type] ?? '📢'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem', color: '#fff' }}>
                  <span style={{ fontWeight: 700 }}>{String(p.user_name ?? '')}</span>
                  {' '}{feedLabels[ev.event_type] ?? ev.event_type}
                  {ev.event_type === 'point_earned' && p.points != null && (
                    <span style={{ marginLeft: '0.4rem', color: '#FFDF00', fontWeight: 900, fontSize: '1.05rem' }}>
                      +{String(p.points)} pts
                    </span>
                  )}
                </p>
                {p.rule_name != null && (
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem', fontFamily: 'Outfit, sans-serif' }}>
                    {String(p.rule_name)}
                  </p>
                )}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap', fontFamily: 'Outfit, sans-serif' }}>
                {new Date(ev.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
        {events.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '3rem 0', fontFamily: 'Outfit, sans-serif' }}>
            Aguardando eventos...
          </p>
        )}
      </div>
    </div>
  )
}

// --- Main ---
function DisplayPanel() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const slug = params.slug
  const token = searchParams.get('token')

  const [campaign, setCampaign] = useState<CampaignRow | null>(null)
  const [ranking, setRanking] = useState<CampaignRanking[]>([])
  const [feedEvents, setFeedEvents] = useState<FeedEventRow[]>([])
  const [celebration, setCelebration] = useState<CelebrationData | null>(null)
  const [view, setView] = useState<View>('ranking')
  const [viewKey, setViewKey] = useState(0)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [timerKey, setTimerKey] = useState(0)

  const supabase = createClient()
  const campaignRef = useRef<CampaignRow | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [audioReady, setAudioReady] = useState(false)

  // Browsers require a user gesture to unlock AudioContext.
  // On first click anywhere on the display, we resume/create it.
  useEffect(() => {
    function unlock() {
      if (audioCtxRef.current) {
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
        setAudioReady(true)
        return
      }
      try {
        const ACtx = window.AudioContext ?? ((window as unknown) as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audioCtxRef.current = new ACtx()
        audioCtxRef.current.resume().then(() => setAudioReady(true)).catch(() => {})
      } catch { /* noop */ }
    }
    document.addEventListener('click', unlock, { once: false })
    return () => document.removeEventListener('click', unlock)
  }, [])

  const nextView = useCallback(() => {
    setView(v => VIEWS[(VIEWS.indexOf(v) + 1) % VIEWS.length])
    setViewKey(k => k + 1)
    setTimerKey(k => k + 1)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: camp } = await supabase.from('campaigns').select('*').eq('slug', slug).single()
      const campRow = camp as CampaignRow | null
      if (!campRow || campRow.display_token !== token) { setAuthorized(false); return }
      setAuthorized(true); setCampaign(campRow); campaignRef.current = campRow

      const { data: r } = await supabase.from('campaign_rankings').select('*').eq('campaign_id', campRow.id).order('position')
      setRanking((r ?? []) as CampaignRanking[])

      const { data: f } = await supabase.from('feed_events').select('*').eq('campaign_id', campRow.id)
        .order('created_at', { ascending: false }).limit(10)
      setFeedEvents((f ?? []) as FeedEventRow[])

      supabase.channel('tv-ranking').on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'point_transactions', filter: `campaign_id=eq.${campRow.id}` },
        async () => {
          const { data } = await supabase.from('campaign_rankings').select('*').eq('campaign_id', campRow.id).order('position')
          setRanking((data ?? []) as CampaignRanking[])
        }).subscribe()

      supabase.channel('tv-feed').on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_events', filter: `campaign_id=eq.${campRow.id}` },
        (payload) => setFeedEvents(prev => [payload.new as FeedEventRow, ...prev.slice(0, 9)])).subscribe()

      supabase.channel('tv-celebration').on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'celebration_events', filter: `campaign_id=eq.${campRow.id}` },
        async (payload) => {
          const ev = payload.new as { user_id: string; points: number; rule_name: string | null; message: string | null }
          const { data: u } = await supabase.from('users').select('name, avatar_url').eq('id', ev.user_id).single()
          const user = u as { name: string; avatar_url: string | null } | null
          setCelebration({ user_id: ev.user_id, points: ev.points, rule_name: ev.rule_name ?? '', message: ev.message ?? '', user_name: user?.name, avatar_url: user?.avatar_url ?? undefined })
        }).subscribe()
    }
    init()
    const poll = setInterval(async () => {
      const camp = campaignRef.current; if (!camp) return
      const { data } = await supabase.from('campaign_rankings').select('*').eq('campaign_id', camp.id).order('position')
      if (data) setRanking(data as CampaignRanking[])
    }, 30000)
    return () => { clearInterval(poll); supabase.removeAllChannels() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, token])

  useEffect(() => {
    if (!authorized || celebration) return
    const t = setInterval(nextView, ROTATION_INTERVAL)
    return () => clearInterval(t)
  }, [authorized, celebration, nextView])

  const daysLeft = campaign?.ends_at ? Math.max(0, Math.ceil((new Date(campaign.ends_at).getTime() - Date.now()) / 86400000)) : null

  if (authorized === null) return (
    <div style={{ minHeight: '100vh', background: '#060E07', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid #8DB23C', borderTopColor: 'transparent', animation: 'spin 0.9s linear infinite' }} />
      <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif', fontSize: '0.9rem' }}>Carregando painel...</p>
      <style>{CSS}</style>
    </div>
  )
  if (!authorized) return (
    <div style={{ minHeight: '100vh', background: '#060E07', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#c0622a', fontFamily: 'sans-serif', fontSize: '1.5rem' }}>Acesso não autorizado.</p>
      <style>{CSS}</style>
    </div>
  )

  const top3 = ranking.slice(0, 3)
  const viewLabels: Record<View, string> = { ranking: 'Classificação', top3: 'Pódio', feed: 'Feed ao Vivo' }

  return (
    <div style={{
      minHeight: '100vh', width: '100%', overflow: 'hidden', userSelect: 'none',
      background: 'radial-gradient(ellipse at 25% -10%, #0D2410 0%, #060E07 55%, #020605 100%)',
      display: 'flex', flexDirection: 'column', fontFamily: 'Outfit, system-ui, sans-serif',
    }}>
      <style>{CSS}</style>
      <CelebrationOverlay event={celebration} onDone={() => setCelebration(null)} audioCtxRef={audioCtxRef} />

      {/* Animated top accent */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #5C7435, #8DB23C, #BACB3A, #FFDF00, #BACB3A, #8DB23C, #5C7435)', backgroundSize: '200% 100%', animation: 'shimmer 4s linear infinite' }} />

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.8rem 2.5rem', borderBottom: '1px solid rgba(141,178,60,0.1)',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)',
        flexShrink: 0, position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Image src="/logo-scmidia.png" alt="SCMídia" width={90} height={26} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.8 }} />
          <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.12)' }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFDF00', letterSpacing: '-0.01em', fontFamily: 'Outfit, sans-serif' }}>
            ⚽ Missão Hexa
          </span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 700, fontSize: '1.15rem', color: '#fff', letterSpacing: '-0.01em', fontFamily: 'Outfit, sans-serif' }}>
            {campaign?.name}
          </p>
          <p style={{ fontSize: '0.68rem', color: '#8DB23C', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>
            {viewLabels[view]}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          {daysLeft !== null && (
            <p style={{ fontSize: '0.75rem', color: daysLeft === 0 ? '#FFDF00' : '#8DB23C', fontWeight: 700, animation: daysLeft === 0 ? 'pulse 1s infinite' : 'none' }}>
              {daysLeft === 0 ? '🔥 Último dia!' : `${daysLeft} dias restantes`}
            </p>
          )}
          <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>
            <Clock />
          </p>
        </div>

        {/* Timer progress bar */}
        <ProgressBar duration={ROTATION_INTERVAL} key={timerKey} />
      </header>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.25rem 2.5rem', overflow: 'hidden' }}>
        {view === 'ranking' && <RankingView rows={ranking} viewKey={viewKey} />}
        {view === 'top3' && <PodiumView top3={top3} viewKey={viewKey} />}
        {view === 'feed' && <FeedView events={feedEvents} viewKey={viewKey} />}
      </main>

      {/* Footer */}
      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.55rem 2.5rem',
        borderTop: '1px solid rgba(141,178,60,0.07)',
        background: 'rgba(0,0,0,0.25)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {VIEWS.map(v => (
            <button key={v} onClick={() => { setView(v); setViewKey(k => k + 1); setTimerKey(k => k + 1) }}
              style={{
                height: 4, borderRadius: 2, cursor: 'pointer', border: 'none', padding: 0,
                width: v === view ? 28 : 8,
                background: v === view ? '#8DB23C' : 'rgba(255,255,255,0.12)',
                transition: 'all 0.35s ease',
              }} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.18)', fontFamily: 'Outfit, sans-serif' }}>
            scmidia.com.br — Missão Hexa
          </p>
          <span style={{
            fontSize: '0.62rem', fontFamily: 'Outfit, sans-serif',
            color: audioReady ? '#8DB23C' : 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', gap: '0.25rem',
          }}>
            {audioReady ? '🔊 som ativo' : '🔇 clique para som'}
          </span>
        </div>
      </footer>
    </div>
  )
}

export default function DisplayPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#060E07', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif' }}>Carregando...</p>
      </div>
    }>
      <DisplayPanel />
    </Suspense>
  )
}
