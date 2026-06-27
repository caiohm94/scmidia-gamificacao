'use client'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/shared/Avatar'

interface CelebrationEvent {
  user_id: string
  points: number
  rule_name: string
  message: string
  avatar_url?: string
  user_name?: string
}

interface Props { event: CelebrationEvent | null; onDone: () => void }

export function CelebrationOverlay({ event, onDone }: Props) {
  useEffect(() => {
    if (!event) return
    const t = setTimeout(onDone, 8000)
    return () => clearTimeout(t)
  }, [event, onDone])

  if (!event) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-300">
      {/* Confetti effect via CSS animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="absolute w-3 h-3 rounded-sm animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: ['#F9A825','#1B5E20','#FFFFFF','#FFD700'][i % 4],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${0.5 + Math.random()}s`,
            }} />
        ))}
      </div>

      <div className="text-center space-y-6 relative z-10">
        <div className="text-8xl animate-bounce">⚽</div>
        {event.avatar_url && (
          <Avatar src={event.avatar_url} name={event.user_name ?? ''} size={120}
            className="mx-auto ring-8 ring-yellow-500" />
        )}
        <div className="space-y-2">
          <h2 className="text-5xl font-black text-yellow-400">{event.user_name ?? event.message}</h2>
          <p className="text-3xl font-bold text-white">+{event.points} pontos! 🥅</p>
          <p className="text-xl text-gray-400">{event.rule_name}</p>
        </div>
        <div className="text-6xl">🏆🎊🏆</div>
      </div>
    </div>
  )
}
