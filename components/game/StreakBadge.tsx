interface Props { streak: number }

export function StreakBadge({ streak }: Props) {
  if (streak === 0) return null
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40">
      🔥 {streak} {streak === 1 ? 'dia' : 'dias'} seguidos
    </span>
  )
}
