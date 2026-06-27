import { Avatar } from '@/components/shared/Avatar'
import type { CampaignRanking } from '@/types/database'

const functionLabels: Record<string, string> = {
  internal_seller: 'Vendedor Int.',
  external_seller: 'Vendedor Ext.',
  hunter: 'Hunter',
  manager: 'Gestor',
  auditor: 'Auditor',
}

interface Props {
  player: CampaignRanking
  /** Override accent color (defaults to Missão Hexa yellow) */
  theme?: { secondary?: string }
}

/**
 * FIFA-style player card for the Missão Hexa campaign.
 * Shows position, avatar, name, points, and streak.
 */
export function PlayerCard({ player, theme }: Props) {
  const accent = theme?.secondary ?? '#FFDF00'

  return (
    <div
      className="relative w-36 rounded-xl overflow-hidden border-2 bg-gradient-to-b from-green-900 to-black text-white text-center p-3 space-y-2 shadow-lg"
      style={{ borderColor: accent }}
    >
      {/* Position badge */}
      <div className="text-2xl font-black font-hexa-heading" style={{ color: accent }}>
        {player.position}
      </div>

      {/* Avatar with accent ring */}
      <div
        className="mx-auto w-fit rounded-full p-0.5"
        style={{ backgroundColor: accent }}
      >
        <Avatar
          src={player.avatar_url}
          name={player.name}
          size={60}
          className="ring-0"
        />
      </div>

      {/* Name */}
      <div>
        <p className="text-xs font-bold truncate">{player.name.split(' ')[0]}</p>
        <p className="text-[10px] text-gray-400 truncate">
          {player.name.split(' ').slice(1).join(' ')}
        </p>
      </div>

      {/* Points */}
      <div className="text-lg font-black font-hexa-heading" style={{ color: accent }}>
        {player.total_points.toLocaleString('pt-BR')}
        <span className="text-[9px] font-sans font-normal text-gray-400 ml-0.5">pts</span>
      </div>

      {/* Function / role label */}
      <div className="text-[10px] text-gray-400 border-t border-white/10 pt-1">
        {functionLabels[player.function] ?? player.function}
      </div>

      {/* Streak badge — top-right corner */}
      {player.current_streak > 0 && (
        <div
          className="absolute top-1 right-1 text-[10px] leading-none font-bold"
          title={`${player.current_streak} dias seguidos`}
        >
          🔥{player.current_streak}
        </div>
      )}
    </div>
  )
}
