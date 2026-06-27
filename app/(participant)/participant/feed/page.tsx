'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FeedItem } from '@/components/game/FeedItem'

export default function FeedPage() {
  const [events, setEvents] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Initial load
    supabase.from('feed_events').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setEvents(data ?? []))

    // Realtime subscription
    const channel = supabase.channel('feed')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'feed_events'
      }, payload => {
        setEvents(prev => [payload.new as any, ...prev.slice(0, 49)])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Feed ao Vivo 📡</h1>
      <div className="space-y-2">
        {events.map(e => <FeedItem key={e.id} event={e} />)}
        {events.length === 0 && (
          <p className="text-gray-400 text-center py-8">Nenhuma atividade ainda. Seja o primeiro! ⚽</p>
        )}
      </div>
    </div>
  )
}
