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
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      padding: '0.75rem 1rem',
      borderRadius: '0 0.5rem 0.5rem 0.5rem',
      background: 'var(--p-card-bg)',
      border: '1px solid var(--p-card-border)',
    }}>
      <div style={{ fontSize: '1.3rem', marginTop: 2, flexShrink: 0 }}>
        {event.event_type === 'point_earned'
          ? (Number(payload.points) < 0 ? '🟥' : '⚽')
          : event.event_type === 'level_up' ? '🏅'
          : event.event_type === 'bonus_earned' ? '⭐'
          : event.event_type === 'streak_milestone' ? '🔥' : '📢'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--p-text)', margin: 0 }}>
          <span style={{ fontWeight: 600 }}>{payload.user_name}</span>
          {' '}{eventLabels[event.event_type] ?? event.event_type}
          {event.event_type === 'point_earned' && payload.points != null && (
            <span style={{ marginLeft: '0.25rem', color: Number(payload.points) < 0 ? '#ef4444' : '#FFDF00', fontWeight: 700 }}>
              {Number(payload.points) > 0 ? '+' : ''}{payload.points} pts
            </span>
          )}
        </p>
        {payload.rule_name && (
          <p style={{ fontSize: '0.72rem', color: 'var(--p-muted)', marginTop: '0.2rem', margin: '0.2rem 0 0' }}>
            {payload.rule_name}
          </p>
        )}
      </div>
      <span style={{ fontSize: '0.7rem', color: 'var(--p-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {formatDistanceToNow(new Date(event.created_at), { locale: ptBR, addSuffix: true })}
      </span>
    </div>
  )
}
