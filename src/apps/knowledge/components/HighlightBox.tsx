type BoxType = 'info' | 'tip' | 'warn' | 'danger'

const CONFIG: Record<BoxType, { icon: string; classes: string }> = {
  info:   { icon: 'ℹ️',  classes: 'border-blue-500/40   bg-blue-950/30   text-blue-200'   },
  tip:    { icon: '💡', classes: 'border-green-500/40  bg-green-950/30  text-green-200'  },
  warn:   { icon: '⚠️',  classes: 'border-yellow-500/40 bg-yellow-950/30 text-yellow-200' },
  danger: { icon: '🔴', classes: 'border-red-500/40    bg-red-950/30    text-red-200'    },
}

interface Props {
  type?: BoxType
  children: React.ReactNode
}

export default function HighlightBox({ type = 'info', children }: Props) {
  const cfg = CONFIG[type]
  return (
    <div
      className={[
        'my-3 flex gap-3 rounded-xl border-l-[3px] p-4 text-sm leading-relaxed',
        cfg.classes,
      ].join(' ')}
    >
      <span className="mt-0.5 shrink-0 text-base leading-none">{cfg.icon}</span>
      <div>{children}</div>
    </div>
  )
}
