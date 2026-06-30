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
  const [celebQueue, setCelebQueue] = useState<CelebrationData[]>([])
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const celebWaitingRef = useRef(false)
  const celebTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

          setCelebQueue(prev => [...prev, {
            user_id: ev.user_id,
            points: ev.points,
            rule_name: ev.rule_name ?? '',
            message: ev.message ?? '',
            user_name: userName,
            avatar_url: photoUrl,
          }])
        })
        .subscribe()
    }

    init()
  }, [slug, token])

  // Process celebration queue
  useEffect(() => {
    if (celebration !== null || celebWaitingRef.current || celebQueue.length === 0) return
    const [next, ...rest] = celebQueue
    setCelebration(next)
    setCelebQueue(rest)
  }, [celebration, celebQueue])

  function handleCelebrationDone() {
    setCelebration(null)
    celebWaitingRef.current = true
    if (celebTimerRef.current) clearTimeout(celebTimerRef.current)
    celebTimerRef.current = setTimeout(() => {
      celebWaitingRef.current = false
      setCelebQueue(prev => {
        if (prev.length === 0) return prev
        const [next, ...rest] = prev
        setCelebration(next)
        return rest
      })
    }, 30000)
  }

  if (authorized === false) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif' }}>
        Token inválido ou campanha não encontrada.
      </div>
    )
  }

  const downloadUrl = `/api/display/bi-standalone?slug=${slug}&token=${encodeURIComponent(token)}&bi=${encodeURIComponent(biUrl)}`

  // Mixed content warning: page is HTTPS but BI is HTTP — iframe won't load.
  // Show instructions to use the standalone HTML file instead.
  const isHttpBi = biUrl.startsWith('http://')

  if (isHttpBi || !biUrl) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', color: '#fff', fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📥</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem' }}>Arquivo para TV</h2>
          <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            O painel Power BI usa <strong>HTTP</strong>, mas esta página usa HTTPS — o navegador bloqueia o iframe por segurança.
            <br/><br/>
            Baixe o arquivo abaixo, salve na TV e abra diretamente no Chrome. Ele mostra o Power BI normalmente e exibe as celebrações em cima quando um ponto é lançado.
          </p>
          <a href={downloadUrl} download style={{
            display: 'inline-block', padding: '0.75rem 1.5rem',
            background: '#8DB23C', color: '#fff', borderRadius: '0 0.5rem 0.5rem 0.5rem',
            fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
          }}>
            ⬇ Baixar arquivo HTML da TV
          </a>
        </div>
      </div>
    )
  }

  // HTTPS BI URL — iframe works normally
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <iframe
        src={biUrl}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        allow="fullscreen"
        title="Power BI"
      />
      <CelebrationOverlay
        event={celebration}
        onDone={handleCelebrationDone}
        audioCtxRef={audioCtxRef}
      />
    </div>
  )
}
