'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FeedItem } from '@/components/game/FeedItem'

export default function FeedPage() {
  const [events, setEvents] = useState<any[]>([])
  const [ready, setReady] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id
      if (!uid) { setReady(true); return }

      supabase
        .from('feed_events')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data: rows }) => { setEvents(rows ?? []); setReady(true) })

      const channel = supabase.channel('feed-user')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'feed_events',
          filter: `user_id=eq.${uid}`,
        }, payload => {
          setEvents(prev => [payload.new as any, ...prev.slice(0, 49)])
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [])

  const muted = 'var(--p-muted)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', margin: 0 }}>
        Minhas Atividades 📡
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {ready && events.length === 0 && (
          <p style={{ color: muted, textAlign: 'center', padding: '3rem', fontSize: '0.85rem' }}>
            Nenhuma atividade ainda. Seja o primeiro! ⚽
          </p>
        )}
        {events.map(e => <FeedItem key={e.id} event={e} />)}
      </div>
    </div>
  )
}
