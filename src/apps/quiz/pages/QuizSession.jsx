import { useState, useCallback, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Flashcard from '../components/Flashcard'
import { categories, questions } from '../data/quizData'
import { useQuizStorage } from '../hooks/useQuizStorage'

const COLOR_MAP = {
  purple: '#a855f7', blue: '#3b82f6', orange: '#f97316',
  green: '#22c55e', teal: '#14b8a6', yellow: '#eab308',
}
const DIM_MAP = {
  purple: 'rgba(168,85,247,0.12)', blue: 'rgba(59,130,246,0.12)', orange: 'rgba(249,115,22,0.12)',
  green: 'rgba(34,197,94,0.12)', teal: 'rgba(20,184,166,0.12)', yellow: 'rgba(234,179,8,0.12)',
}

function getModeFromStorage() {
  try {
    const s = localStorage.getItem('quiz_mode')
    if (s === 'write' || s === 'flip') return s
  } catch (_) {}
  return 'flip'
}

export default function QuizSession() {
  const { categoryId } = useParams()
  const category = categories.find(c => c.id === categoryId)
  const categoryQuestions = useMemo(() => questions.filter(q => q.category === categoryId), [categoryId])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState([])
  const [phase, setPhase] = useState('quiz')
  const [showResume, setShowResume] = useState(false)
  const [savedProgress, setSavedProgress] = useState(null)
  const [mode, setMode] = useState(getModeFromStorage)
  const [writtenAnswer, setWrittenAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)

  const { loadProgress, saveProgress, clearProgress, saveBest, updateStats } = useQuizStorage(categoryId)

  useEffect(() => {
    const progress = loadProgress()
    if (progress && progress.phase === 'quiz') {
      setSavedProgress(progress)
      setShowResume(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const total = categoryQuestions.length
  const current = categoryQuestions[currentIndex]
  const progressPct = total > 0 ? (currentIndex / total) * 100 : 0
  const accentColor = COLOR_MAP[category?.color] || COLOR_MAP.blue
  const accentDim = DIM_MAP[category?.color] || DIM_MAP.blue

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    try { localStorage.setItem('quiz_mode', newMode) } catch (_) {}
    setFlipped(false); setWrittenAnswer(''); setRevealed(false)
  }, [])

  const handleFlip = useCallback(() => { if (!flipped) setFlipped(true) }, [flipped])
  const handleReveal = useCallback(() => { setRevealed(true) }, [])

  const handleRate = useCallback((correct) => {
    const newResults = [...results, { questionId: current.id, correct }]
    setResults(newResults)
    setFlipped(false); setWrittenAnswer(''); setRevealed(false)

    if (currentIndex + 1 >= total) {
      setTimeout(() => {
        const score = newResults.filter(r => r.correct).length
        clearProgress(); saveBest(score, total); updateStats(score, total)
        setPhase('results')
      }, 350)
    } else {
      const nextIndex = currentIndex + 1
      saveProgress({ currentIndex: nextIndex, results: newResults, phase: 'quiz' })
      setTimeout(() => setCurrentIndex(nextIndex), 350)
    }
  }, [results, current, currentIndex, total, clearProgress, saveBest, updateStats, saveProgress])

  const handleRetry = useCallback(() => {
    setCurrentIndex(0); setFlipped(false); setWrittenAnswer('')
    setRevealed(false); setResults([]); setPhase('quiz')
  }, [])

  const tagStats = useMemo(() => {
    if (phase !== 'results') return { strong: [], weak: [] }
    const tagMap = {}
    results.forEach(r => {
      const q = categoryQuestions.find(cq => cq.id === r.questionId)
      if (!q) return
      q.tags.forEach(tag => {
        if (!tagMap[tag]) tagMap[tag] = { correct: 0, total: 0 }
        tagMap[tag].total++
        if (r.correct) tagMap[tag].correct++
      })
    })
    const strong = [], weak = []
    Object.entries(tagMap).forEach(([tag, s]) => {
      const pct = s.correct / s.total
      if (pct > 0.7) strong.push(tag)
      else if (pct < 0.5) weak.push(tag)
    })
    return { strong, weak }
  }, [phase, results, categoryQuestions])

  if (!category || total === 0) {
    return (
      <div className="py-20 text-center text-zinc-400">
        <p className="mb-4">Category not found or has no questions.</p>
        <Link to="/quiz" className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white">
          ← Back to categories
        </Link>
      </div>
    )
  }

  if (phase === 'results') {
    const score = results.filter(r => r.correct).length
    const pct = Math.round((score / total) * 100)
    const scoreColor = pct >= 80 ? '#4ade80' : pct >= 50 ? '#fb923c' : '#f87171'

    return (
      <div className="py-12 text-center">
        <div className="mb-2 text-[72px] font-extrabold leading-none tracking-tighter" style={{ color: scoreColor }}>
          {score}/{total}
        </div>
        <div className="mb-10 text-lg text-zinc-400">{pct}% correct</div>

        {(tagStats.strong.length > 0 || tagStats.weak.length > 0) && (
          <div className="mx-auto mb-10 grid max-w-lg grid-cols-2 gap-4 text-left">
            {tagStats.strong.length > 0 && (
              <div className="rounded-xl border border-white/[0.07] bg-zinc-900/60 p-4">
                <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-green-500">Strong areas</h4>
                <div className="flex flex-wrap gap-1.5">
                  {tagStats.strong.map(tag => (
                    <span key={tag} className="rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-300">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {tagStats.weak.length > 0 && (
              <div className="rounded-xl border border-white/[0.07] bg-zinc-900/60 p-4">
                <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-red-500">Needs work</h4>
                <div className="flex flex-wrap gap-1.5">
                  {tagStats.weak.map(tag => (
                    <span key={tag} className="rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-300">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleRetry}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: accentColor }}
          >
            Retry this category
          </button>
          <Link
            to="/quiz"
            className="inline-flex rounded-xl border border-white/[0.1] px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:text-white"
          >
            ← Back to categories
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Resume banner */}
      {showResume && savedProgress && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-950/20 px-4 py-3.5">
          <p className="text-[13px] text-zinc-400">
            You left off at card <strong className="text-zinc-200">{savedProgress.currentIndex + 1}</strong> of{' '}
            <strong className="text-zinc-200">{total}</strong> — resume or start over?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setCurrentIndex(savedProgress.currentIndex); setResults(savedProgress.results); setShowResume(false) }}
              className="rounded-lg border border-blue-500/30 bg-blue-950/40 px-3.5 py-1.5 text-[12px] font-semibold text-blue-400"
            >
              Resume
            </button>
            <button
              onClick={() => { clearProgress(); setShowResume(false) }}
              className="rounded-lg border border-white/[0.08] px-3.5 py-1.5 text-[12px] font-semibold text-zinc-400"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${progressPct}%`, background: accentColor }}
          />
        </div>
        <div className="flex items-center justify-between text-[12px] text-zinc-500">
          <span>Card <strong className="text-zinc-300">{currentIndex + 1}</strong> of <strong className="text-zinc-300">{total}</strong></span>
          <span>{category.icon} {category.label}</span>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="mb-5 flex w-fit gap-0.5 rounded-xl border border-white/[0.07] bg-zinc-900/60 p-1">
        {['flip', 'write'].map(m => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={[
              'rounded-lg px-4 py-1.5 text-[13px] font-semibold capitalize transition-all duration-100',
              mode === m
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300',
            ].join(' ')}
          >
            {m}
          </button>
        ))}
      </div>

      <Flashcard
        question={current.question}
        answer={current.answer}
        hint={current.hint}
        flipped={flipped}
        onFlip={handleFlip}
        categoryColor={category.color}
        mode={mode}
        revealed={revealed}
        writtenAnswer={writtenAnswer}
      />

      {/* Controls */}
      {mode === 'flip' ? (
        flipped ? (
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => handleRate(true)}
              className="flex flex-1 items-center justify-center rounded-xl border border-green-500/25 bg-green-950/30 py-3.5 text-[14px] font-bold text-green-400 transition-opacity hover:opacity-85"
            >
              Got it ✓
            </button>
            <button
              onClick={() => handleRate(false)}
              className="flex flex-1 items-center justify-center rounded-xl border border-red-500/25 bg-red-950/30 py-3.5 text-[14px] font-bold text-red-400 transition-opacity hover:opacity-85"
            >
              Missed ✗
            </button>
          </div>
        ) : (
          <p className="mt-4 text-center text-[12px] text-zinc-600">
            Click the card to reveal the answer
          </p>
        )
      ) : (
        !revealed ? (
          <div className="mt-4 flex flex-col gap-3">
            <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-600">
              Your answer:
            </label>
            <textarea
              className="min-h-[120px] resize-y rounded-xl border border-white/[0.08] bg-zinc-900/60 p-4 font-mono text-[13px] leading-relaxed text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-blue-500/40"
              placeholder="Type your answer before revealing..."
              value={writtenAnswer}
              onChange={e => setWrittenAnswer(e.target.value)}
            />
            <button
              onClick={handleReveal}
              disabled={writtenAnswer.trim().length === 0}
              className="rounded-xl py-3 text-[14px] font-semibold text-white transition-opacity disabled:opacity-30"
              style={{ background: accentColor }}
            >
              Reveal Answer
            </button>
          </div>
        ) : (
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => handleRate(true)}
              className="flex flex-1 items-center justify-center rounded-xl border border-green-500/25 bg-green-950/30 py-3.5 text-[14px] font-bold text-green-400 transition-opacity hover:opacity-85"
            >
              Got it ✓
            </button>
            <button
              onClick={() => handleRate(false)}
              className="flex flex-1 items-center justify-center rounded-xl border border-red-500/25 bg-red-950/30 py-3.5 text-[14px] font-bold text-red-400 transition-opacity hover:opacity-85"
            >
              Missed ✗
            </button>
          </div>
        )
      )}
    </>
  )
}
