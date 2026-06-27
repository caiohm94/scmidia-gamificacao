'use client'
import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RankingTable } from '@/components/game/RankingTable'
import { FeedItem } from '@/components/game/FeedItem'
import { CelebrationOverlay } from '@/components/game/CelebrationOverlay'
import type { CampaignRanking } from '@/types/database'

const ROTATION_INTERVAL = 15000 // 15s
const VIEWS = ['ranking', 'top3', 'feed'] as const

type View = (typeof VIEWS)[number]

type CampaignRow = {
  id: string
  name: string
  slug: string
  display_token: string
  ends_at: string | null
  theme: Record<string, string>
}

type FeedEventRow = {
  id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
  user_id: string
}

type CelebrationData = {
  user_id: string
  points: number
  rule_name: string
  message: string
  avatar_url?: string
  user_name?: string
}

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
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: camp } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', slug)
        .single()

      const campRow = camp as CampaignRow | null

      if (!campRow || campRow.display_token !== token) {
        setAuthorized(false)
        return
      }

      setAuthorized(true)
      setCampaign(campRow)

      // Load ranking
      const { data: r } = await supabase
        .from('campaign_rankings')
        .select('*')
        .eq('campaign_id', campRow.id)
        .order('position')
      setRanking((r ?? []) as CampaignRanking[])

      // Load feed
      const { data: f } = await supabase
        .from('feed_events')
        .select('*')
        .eq('campaign_id', campRow.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setFeedEvents((f ?? []) as FeedEventRow[])

      // Realtime: ranking updates via point_transactions
      supabase
        .channel('display-rankings')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'point_transactions',
            filter: `campaign_id=eq.${campRow.id}`,
          },
          async () => {
            const { data } = await supabase
              .from('campaign_rankings')
              .select('*')
              .eq('campaign_id', campRow.id)
              .order('position')
            setRanking((data ?? []) as CampaignRanking[])
          }
        )
        .subscribe()

      // Realtime: feed events
      supabase
        .channel('display-feed')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'feed_events',
            filter: `campaign_id=eq.${campRow.id}`,
          },
          (payload) => {
            setFeedEvents((prev) => [payload.new as FeedEventRow, ...prev.slice(0, 9)])
          }
        )
        .subscribe()

      // Realtime: celebration events
      supabase
        .channel('display-celebrations')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'celebration_events',
            filter: `campaign_id=eq.${campRow.id}`,
          },
          async (payload) => {
            const ev = payload.new as { user_id: string; points: number; rule_name: string | null; message: string | null }
            const { data: u } = await supabase
              .from('users')
              .select('name, avatar_url')
              .eq('id', ev.user_id)
              .single()
            const userData = u as { name: string; avatar_url: string | null } | null
            setCelebration({
              user_id: ev.user_id,
              points: ev.points,
              rule_name: ev.rule_name ?? '',
              message: ev.message ?? '',
              user_name: userData?.name,
              avatar_url: userData?.avatar_url ?? undefined,
            })
          }
        )
        .subscribe()
    }

    init()

    // 30s polling fallback for ranking
    const poll = setInterval(async () => {
      if (!campaign) return
      const { data } = await supabase
        .from('campaign_rankings')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('position')
      if (data) setRanking(data as CampaignRanking[])
    }, 30000)

    return () => {
      clearInterval(poll)
      supabase.removeAllChannels()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, token])

  // Rotate views (pause during celebrations)
  useEffect(() => {
    if (!authorized || celebration) return
    const t = setInterval(() => {
      setView((v) => {
        const idx = VIEWS.indexOf(v)
        return VIEWS[(idx + 1) % VIEWS.length]
      })
    }, ROTATION_INTERVAL)
    return () => clearInterval(t)
  }, [authorized, celebration])

  // Loading state
  if (authorized === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white text-xl">
        Carregando...
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white text-2xl">
        Acesso não autorizado.
      </div>
    )
  }

  const top3 = ranking.slice(0, 3)
  const medals = ['🥇', '🥈', '🥉']
  const theme = campaign?.theme ?? {}
  const primaryColor = (theme as Record<string, string>).primary ?? '#1B5E20'
  const secondaryColor = (theme as Record<string, string>).secondary ?? '#F9A825'

  return (
    <div
      className="min-h-screen text-white overflow-hidden select-none"
      style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #0A0A0A 100%)` }}
    >
      <CelebrationOverlay event={celebration} onDone={() => setCelebration(null)} />

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <h1 className="text-3xl font-black" style={{ color: secondaryColor }}>
          🏆 {campaign?.name}
        </h1>
        <div className="text-right text-sm text-gray-400">
          {campaign?.ends_at && (
            <p>
              {Math.max(
                0,
                Math.ceil((new Date(campaign.ends_at).getTime() - Date.now()) / 86400000)
              )}{' '}
              dias restantes
            </p>
          )}
          <p className="text-xs">{new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </div>

      {/* Content area */}
      <div className="px-8 py-6">
        {view === 'ranking' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-300">Ranking Geral</h2>
            <RankingTable rows={ranking.slice(0, 10)} />
          </div>
        )}

        {view === 'top3' && (
          <div className="flex items-end justify-center gap-8 h-80">
            {/* Render as 2nd, 1st, 3rd */}
            {[top3[1], top3[0], top3[2]].map((row, i) => {
              if (!row) return <div key={i} className="w-48" />
              const heights = ['h-48', 'h-72', 'h-40']
              const positions = [1, 0, 2]
              return (
                <div
                  key={row.user_id}
                  className={`w-48 ${heights[i]} flex flex-col items-center justify-end pb-4 rounded-t-2xl`}
                  style={{
                    backgroundColor: secondaryColor + (i === 1 ? '30' : '15'),
                  }}
                >
                  <p className="text-4xl">{medals[positions[i]]}</p>
                  <p className="font-bold text-center text-sm mt-2">{row.name}</p>
                  <p
                    className="text-2xl font-black"
                    style={{ color: secondaryColor }}
                  >
                    {row.total_points.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-400">pontos</p>
                </div>
              )
            })}
          </div>
        )}

        {view === 'feed' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-300">Feed ao Vivo 📡</h2>
            <div className="space-y-2">
              {feedEvents.slice(0, 6).map((e) => (
                <FeedItem key={e.id} event={e} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* View indicator dots */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {VIEWS.map((v) => (
          <div
            key={v}
            className={`h-2 rounded-full transition-all ${v === view ? 'bg-yellow-400 w-4' : 'bg-gray-600 w-2'}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function DisplayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white text-xl">
          Carregando...
        </div>
      }
    >
      <DisplayPanel />
    </Suspense>
  )
}
