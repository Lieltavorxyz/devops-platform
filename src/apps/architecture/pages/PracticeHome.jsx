import { useNavigate } from 'react-router-dom'
import { scenarios } from '../data/architectureScenarios'

const DIFF = {
  beginner:     { bg: 'rgba(34,197,94,0.1)',  text: '#4ade80', bar: '#22c55e',  border: 'rgba(34,197,94,0.3)'  },
  intermediate: { bg: 'rgba(249,115,22,0.1)', text: '#fb923c', bar: '#f97316', border: 'rgba(249,115,22,0.3)' },
  advanced:     { bg: 'rgba(239,68,68,0.1)',  text: '#f87171', bar: '#ef4444', border: 'rgba(239,68,68,0.3)'  },
}

function diffCount(level) {
  return scenarios.filter(s => s.difficulty === level).length
}

export default function PracticeHome() {
  const navigate = useNavigate()
  const total = scenarios.length

  return (
    <>
      {/* Header */}
      <div className="mb-10">
        <h1 className="mb-2 text-[36px] font-extrabold tracking-tight text-zinc-100">
          Architecture Practice
        </h1>
        <p className="mb-4 text-base text-zinc-400">
          Step-by-step system design scenarios with drawing canvas
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1 text-xs font-medium text-zinc-400">
            {total} scenarios
          </span>
          {['beginner', 'intermediate', 'advanced'].map(d => (
            <span
              key={d}
              className="inline-flex items-center rounded-full px-3.5 py-1 text-xs font-semibold"
              style={{ background: DIFF[d].bg, color: DIFF[d].text }}
            >
              {diffCount(d)} {d}
            </span>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {scenarios.map(scenario => {
          const d = DIFF[scenario.difficulty] || DIFF.intermediate
          return (
            <div
              key={scenario.id}
              className="group relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-xl border bg-zinc-900/50 p-6 transition-all duration-150"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
              onClick={() => navigate(`/architecture/practice/${scenario.id}`)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = d.border; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 20px ${d.bg}` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'none' }}
            >
              {/* Diff color top bar */}
              <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl" style={{ background: d.bar }} />

              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[15px] font-bold leading-tight text-zinc-100">{scenario.title}</h3>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
                  style={{ background: d.bg, color: d.text }}
                >
                  {scenario.difficulty}
                </span>
              </div>

              <p className="flex-1 text-[13px] leading-relaxed text-zinc-500">{scenario.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {scenario.tags.map(tag => (
                  <span key={tag} className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                <div className="flex gap-4 text-[11px] text-zinc-600">
                  <span>⏱ ~{scenario.estimatedMinutes} min</span>
                  <span>{scenario.steps.length} steps</span>
                </div>
                <span className="text-[12px] font-semibold transition-colors duration-100" style={{ color: d.text }}>
                  Start Practice →
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
