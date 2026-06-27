interface Props { name: string; icon: string; color: string }

export function LevelBadge({ name, icon, color }: Props) {
  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border"
      style={{ borderColor: color, color, backgroundColor: color + '20' }}
    >
      {icon} {name}
    </span>
  )
}
