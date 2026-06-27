'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem
} from '@/components/ui/dropdown-menu'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const supabase = createClient()
  const unread = notifications.filter(n => !n.read_at).length

  useEffect(() => {
    supabase.from('notifications').select('*').is('read_at', null).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setNotifications(data ?? []))

    const channel = supabase.channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        payload => setNotifications(prev => [payload.new as any, ...prev]))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function markAllRead() {
    await fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-300 hover:text-white hover:bg-accent">
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex justify-between items-center px-3 py-2 border-b">
          <span className="font-semibold text-sm">Notificações</span>
          {unread > 0 && <button onClick={markAllRead} className="text-xs text-yellow-500 hover:underline">Marcar todas como lidas</button>}
        </div>
        {notifications.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nenhuma notificação</p>}
        {notifications.map(n => (
          <DropdownMenuItem key={n.id} className={`flex flex-col items-start gap-0.5 ${!n.read_at ? 'bg-yellow-50 dark:bg-yellow-500/5' : ''}`}>
            <span className="font-medium text-sm">{n.title}</span>
            <span className="text-xs text-gray-400">{n.body}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
