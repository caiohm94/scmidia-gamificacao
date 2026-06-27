import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Avatar } from '@/components/shared/Avatar'

const eventLabels: Record<string, string> = {
  point_earned: 'marcou pontos',
  level_up: 'subiu de nível',
  bonus_earned: 'conquistou um bônus',
  streak_milestone: 'atingiu sequência especial',
  campaign_start: 'A campanha começou!',
  campaign_end: 'A campanha encerrou!',
}

interface FeedEvent {
  id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
  user_id: string
}

export function FeedItem({ event }: { event: FeedEvent }) {
  const payload = event.payload as any
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-900 border border-gray-800">
      <div className="text-2xl mt-0.5">
        {event.event_type === 'point_earned' ? '⚽' :
         event.event_type === 'level_up' ? '🏅' :
         event.event_type === 'bonus_earned' ? '⭐' :
         event.event_type === 'streak_milestone' ? '🔥' : '📢'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">
          <span className="font-semibold">{payload.user_name}</span>
          {' '}{eventLabels[event.event_type] ?? event.event_type}
          {event.event_type === 'point_earned' && payload.points && (
            <span className="ml-1 text-yellow-400 font-bold">+{payload.points} pts</span>
          )}
        </p>
        {payload.rule_name && (
          <p className="text-xs text-gray-400 mt-0.5">{payload.rule_name}</p>
        )}
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {formatDistanceToNow(new Date(event.created_at), { locale: ptBR, addSuffix: true })}
      </span>
    </div>
  )
}
