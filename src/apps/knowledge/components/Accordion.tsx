import { useState } from 'react'

interface Props {
  title: string
  icon?: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function Accordion({ title, icon, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      className={[
        'mb-3 rounded-xl border transition-colors duration-150',
        open
          ? 'border-blue-500/30 bg-blue-950/20'
          : 'border-white/[0.07] bg-zinc-900/40 hover:border-white/[0.12]',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-base leading-none">{icon}</span>}
          <span className={['text-sm font-semibold', open ? 'text-blue-300' : 'text-zinc-200'].join(' ')}>
            {title}
          </span>
        </div>
        <span
          className={[
            'text-[10px] text-zinc-500 transition-transform duration-150',
            open ? 'rotate-180' : '',
          ].join(' ')}
        >
          ▼
        </span>
      </button>
      {open && (
        <div className="border-t border-white/[0.06] px-4 py-4 text-sm text-zinc-300">
          {children}
        </div>
      )}
    </div>
  )
}
