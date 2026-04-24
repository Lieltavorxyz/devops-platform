import { NavLink } from 'react-router-dom'
import { URLS } from '../../config'

const TABS = [
  { to: '/knowledge', label: 'Knowledge' },
  { to: '/quiz',      label: 'Quiz'      },
  { to: '/interview', label: 'Interview' },
]

export default function TopBar() {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 h-12 border-b"
      style={{
        background: 'rgba(9,9,11,0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="mx-auto flex h-full max-w-screen-xl items-center justify-between px-5">

        {/* Left — portfolio back-link */}
        <a
          href={URLS.portfolio}
          className="hidden text-xs font-medium text-zinc-500 transition-colors duration-100 hover:text-zinc-300 sm:block"
        >
          ← ltavor.com
        </a>

        {/* Centre — segmented nav */}
        <nav
          className="flex items-center gap-0.5 rounded-xl border p-1"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          {TABS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all duration-100 select-none',
                  isActive
                    ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                    : 'text-zinc-500 hover:text-zinc-300',
                ].join(' ')
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right — brand */}
        <span className="hidden text-[13px] font-bold tracking-tight text-zinc-400 sm:block">
          DevOps<span className="text-blue-500">Platform</span>
        </span>
      </div>
    </header>
  )
}
