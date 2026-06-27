interface Props { label: string; current: number; target: number; icon?: string }

export function ProgressBar({ label, current, target, icon = '⚽' }: Props) {
  const pct = Math.min(100, Math.round((current / target) * 100))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{icon} {label}</span>
        <span className="text-muted-foreground">{current}/{target}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
