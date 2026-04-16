import { Link } from 'react-router-dom'
import { categories, questions } from '../data/quizData'

const COLOR_CLASSES = {
  purple: { border: 'rgba(168,85,247,0.35)', bar: '#a855f7', text: '#c084fc', dim: 'rgba(168,85,247,0.12)' },
  blue:   { border: 'rgba(59,130,246,0.35)',  bar: '#3b82f6', text: '#60a5fa', dim: 'rgba(59,130,246,0.12)'  },
  orange: { border: 'rgba(249,115,22,0.35)',  bar: '#f97316', text: '#fb923c', dim: 'rgba(249,115,22,0.12)'  },
  green:  { border: 'rgba(34,197,94,0.35)',   bar: '#22c55e', text: '#4ade80', dim: 'rgba(34,197,94,0.12)'   },
  teal:   { border: 'rgba(20,184,166,0.35)',  bar: '#14b8a6', text: '#2dd4bf', dim: 'rgba(20,184,166,0.12)'  },
  yellow: { border: 'rgba(234,179,8,0.35)',   bar: '#eab308', text: '#facc15', dim: 'rgba(234,179,8,0.12)'   },
}

const DIFF_STYLES = {
  beginner:     { bg: 'rgba(34,197,94,0.1)',   text: '#4ade80' },
  intermediate: { bg: 'rgba(249,115,22,0.1)',  text: '#fb923c' },
  advanced:     { bg: 'rgba(239,68,68,0.1)',   text: '#f87171' },
}

function getDifficultyCounts(categoryId) {
  const qs = questions.filter(q => q.category === categoryId)
  const counts = { beginner: 0, intermediate: 0, advanced: 0 }
  qs.forEach(q => { if (counts[q.difficulty] !== undefined) counts[q.difficulty]++ })
  return { total: qs.length, ...counts }
}

export default function QuizHome() {
  const totalQuestions = questions.length

  const getBest = (catId) => {
    try {
      const raw = localStorage.getItem(`quiz_best_${catId}`)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="mb-2 text-[36px] font-extrabold tracking-tight text-zinc-100">
          DevOps Quiz
        </h1>
        <p className="mb-4 text-base text-zinc-400">
          Test your knowledge with real interview questions
        </p>
        <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1 text-xs font-medium text-zinc-400">
          {totalQuestions} questions
        </span>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(cat => {
          const colors = COLOR_CLASSES[cat.color] || COLOR_CLASSES.blue
          const diff = getDifficultyCounts(cat.id)
          const best = getBest(cat.id)

          return (
            <div
              key={cat.id}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-zinc-900/50 p-5 transition-all duration-150"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.boxShadow = `0 4px 20px ${colors.dim}` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              {/* Top accent bar */}
              <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl" style={{ background: colors.bar }} />

              <div className="flex items-center gap-2.5">
                <span className="text-xl leading-none">{cat.icon}</span>
                <span className="text-[15px] font-semibold text-zinc-100">{cat.label}</span>
              </div>

              <p className="text-[12px] leading-relaxed text-zinc-500">{cat.description}</p>

              <div className="flex items-end justify-between gap-2">
                <div>
                  <span className="text-[12px] font-medium text-zinc-500">{diff.total} questions</span>
                  {best && (
                    <div className="mt-1 text-[11px]" style={{ color: colors.text }}>
                      Best: {best.score}/{best.total} ({best.pct}%)
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {diff.beginner > 0 && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: DIFF_STYLES.beginner.bg, color: DIFF_STYLES.beginner.text }}>
                      {diff.beginner} beginner
                    </span>
                  )}
                  {diff.intermediate > 0 && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: DIFF_STYLES.intermediate.bg, color: DIFF_STYLES.intermediate.text }}>
                      {diff.intermediate} inter
                    </span>
                  )}
                  {diff.advanced > 0 && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: DIFF_STYLES.advanced.bg, color: DIFF_STYLES.advanced.text }}>
                      {diff.advanced} advanced
                    </span>
                  )}
                </div>
              </div>

              <Link
                to={`/quiz/${cat.id}`}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-[13px] font-semibold transition-all duration-100"
                style={{ borderColor: colors.border, color: colors.text }}
                onMouseEnter={e => { e.currentTarget.style.background = colors.dim }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                Start <span>→</span>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
