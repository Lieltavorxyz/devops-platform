type Level = 'easy' | 'normal' | 'hard' | 'expert'
type Size  = 'sm' | 'md' | 'lg'

const CONFIG: Record<Level, { label: string; classes: string }> = {
  easy:   { label: 'Easy',   classes: 'bg-green-950/60  text-green-400  border-green-900/60'  },
  normal: { label: 'Normal', classes: 'bg-blue-950/60   text-blue-400   border-blue-900/60'   },
  hard:   { label: 'Hard',   classes: 'bg-orange-950/60 text-orange-400 border-orange-900/60' },
  expert: { label: 'Expert', classes: 'bg-fuchsia-950/60 text-fuchsia-400 border-fuchsia-900/60' },
}

const SIZE: Record<Size, string> = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-[13px] px-3 py-1.5',
}

interface Props {
  level: Level
  size?: Size
}

export default function DifficultyBadge({ level, size = 'md' }: Props) {
  const cfg = CONFIG[level] ?? CONFIG.normal
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border font-semibold whitespace-nowrap',
        cfg.classes,
        SIZE[size],
      ].join(' ')}
    >
      {cfg.label}
    </span>
  )
}
