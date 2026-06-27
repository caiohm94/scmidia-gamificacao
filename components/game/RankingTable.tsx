import { Avatar } from '@/components/shared/Avatar'
import { StreakBadge } from '@/components/game/StreakBadge'
import type { CampaignRanking } from '@/types/database'

interface Props { rows: CampaignRanking[]; highlightUserId?: string }

const medalEmoji = ['🥇', '🥈', '🥉']

export function RankingTable({ rows, highlightUserId }: Props) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 text-gray-400">
          <tr>
            <th className="px-4 py-3 text-left w-12">#</th>
            <th className="px-4 py-3 text-left">Participante</th>
            <th className="px-4 py-3 text-left">Time</th>
            <th className="px-4 py-3 text-right">Pontos</th>
            <th className="px-4 py-3 text-right hidden md:table-cell">Sequência</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.user_id}
              className={`border-t border-gray-800 ${row.user_id === highlightUserId ? 'bg-yellow-500/10' : 'hover:bg-gray-900/50'}`}>
              <td className="px-4 py-3 text-lg">
                {row.position <= 3 ? medalEmoji[row.position - 1] : row.position}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar src={row.avatar_url} name={row.name} size={36} />
                  <div>
                    <p className="font-medium text-white">{row.name}</p>
                    <p className="text-xs text-gray-500">{row.function?.replace('_', ' ')}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {row.team_name && (
                  <span className="text-xs px-2 py-1 rounded-full"
                    style={{ backgroundColor: (row.team_color ?? '#666') + '20', color: row.team_color ?? '#666' }}>
                    {row.team_name}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-bold text-yellow-400 text-lg">
                {row.total_points.toLocaleString('pt-BR')}
              </td>
              <td className="px-4 py-3 text-right hidden md:table-cell">
                <StreakBadge streak={row.current_streak} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
