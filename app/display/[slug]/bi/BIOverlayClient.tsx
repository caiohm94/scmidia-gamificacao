'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CelebrationOverlay } from '@/components/game/CelebrationOverlay'

type CampaignRow = { id: string; name: string; display_token: string }
type CelebrationData = { user_id: string; points: number; rule_name: string; message: string; avatar_url?: string; user_name?: string }

export function BIOverlayClient() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const biUrl = searchParams.get('bi') ?? ''

  const [celebration, setCelebration] = useState<CelebrationData | null>(null)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const supabase = createClient()

  // Unlock AudioContext on any click (browser autoplay policy)
  useEffect(() => {
    function unlock() {
      if (audioCtxRef.current) {
        audioCtxRef.current.resume().catch(() => {})
        return
      }
      try {
        const ACtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audioCtxRef.current = new ACtx()
        audioCtxRef.current.resume().catch(() => {})
      } catch { /* noop */ }
    }
    document.addEventListener('click', unlock)
    return () => document.removeEventListener('click', unlock)
  }, [])

  useEffect(() => {
    if (!slug || !token) { setAuthorized(false); return }

    async function init() {
      const { data: camp } = await supabase
        .from('campaigns')
        .select('id, name, display_token')
        .eq('slug', slug)
        .single()

      const campRow = camp as CampaignRow | null
      if (!campRow || campRow.display_token !== token) { setAuthorized(false); return }
      setAuthorized(true)

      // Listen for celebration events
      supabase.channel('bi-celebration')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'celebration_events',
          filter: `campaign_id=eq.${campRow.id}`,
        }, async (payload) => {
          const ev = payload.new as { user_id: string; points: number; rule_name: string; message: string }

          const [uRes, cpRes] = await Promise.all([
            supabase.from('users').select('name').eq('id', ev.user_id).single(),
            supabase.from('campaign_participants').select('photo_url').eq('user_id', ev.user_id).eq('campaign_id', campRow.id).single(),
          ])

          const userName = (uRes.data as { name: string } | null)?.name
          const photoUrl = (cpRes.data as { photo_url: string | null } | null)?.photo_url ?? undefined

          setCelebration({
            user_id: ev.user_id,
            points: ev.points,
            rule_name: ev.rule_name ?? '',
            message: ev.message ?? '',
            user_name: userName,
            avatar_url: photoUrl,
          })
        })
        .subscribe()
    }

    init()
  }, [slug, token])

  if (authorized === false) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif' }}>
        Token inválido ou campanha não encontrada.
      </div>
    )
  }

  if (!biUrl) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem' }}>
        <div>
          <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Parâmetro <code>bi</code> ausente na URL.</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Exemplo: /display/slug/bi?token=...&bi=http://seu-painel.com</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      {/* Power BI iframe — fullscreen */}
      <iframe
        src={biUrl}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        allow="fullscreen"
        title="Power BI"
      />

      {/* Celebration overlay sits on top of the iframe */}
      <CelebrationOverlay
        event={celebration}
        onDone={() => setCelebration(null)}
        audioCtxRef={audioCtxRef}
      />
    </div>
  )
}
