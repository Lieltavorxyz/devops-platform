import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { scenarios } from '../data/architectureScenarios'
import ArchitectureStudyCard from '../components/ArchitectureStudyCard'
import DiagramCanvas from '../components/DiagramCanvas'

const DIFF = {
  beginner:     { bg: 'rgba(34,197,94,0.1)',  text: '#4ade80' },
  intermediate: { bg: 'rgba(249,115,22,0.1)', text: '#fb923c' },
  advanced:     { bg: 'rgba(239,68,68,0.1)',  text: '#f87171' },
}

const TABS = [
  { key: 'guide', label: 'Guide' },
  { key: 'draw',  label: 'Draw'  },
  { key: 'notes', label: 'Notes' },
]

export default function PracticeSession() {
  const { id } = useParams()
  const scenario = scenarios.find(s => s.id === id)

  const storageKey = `arch_notes_${id}`
  const [notes, setNotes] = useState(() => {
    try { return localStorage.getItem(storageKey) || '' } catch { return '' }
  })
  const [saved, setSaved] = useState(false)
  const saveTimerRef = useRef(null)
  const [activeTab, setActiveTab] = useState('guide')

  function handleNotesChange(e) {
    const val = e.target.value
    setNotes(val)
    try { localStorage.setItem(storageKey, val) } catch {}
    setSaved(true)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => setSaved(false), 2000)
  }

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  if (!scenario) {
    return (
      <div className="mx-auto max-w-[1100px] px-6 pt-20">
        <p className="mb-3 text-zinc-400">Scenario not found.</p>
        <Link to="/architecture" className="text-[13px] text-teal-400 hover:text-teal-300">← Back to scenarios</Link>
      </div>
    )
  }

  const d = DIFF[scenario.difficulty] || DIFF.intermediate

  return (
    <div className="mx-auto max-w-[1100px] px-6 pb-10 pt-6">
      {/* Top */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Link to="/architecture" className="flex items-center gap-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300">
            ← Back to scenarios
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-extrabold tracking-tight text-zinc-100">{scenario.title}</h1>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase" style={{ background: d.bg, color: d.text }}>
              {scenario.difficulty}
            </span>
          </div>
        </div>
        <span className="text-[12px] text-zinc-600">⏱ ~{scenario.estimatedMinutes} min</span>
      </div>

      {/* Mobile tabs */}
      <div className="mb-4 flex gap-1.5 lg:hidden">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'flex-1 rounded-lg border py-2 text-[13px] font-semibold transition-all duration-100',
              activeTab === tab.key
                ? 'border-teal-500/40 bg-teal-950/30 text-teal-400'
                : 'border-white/[0.07] text-zinc-500 hover:text-zinc-300',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Three-panel layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr_320px]"
           style={{ height: 'calc(100vh - 48px - 130px)', minHeight: 500 }}>
        {/* Guide panel */}
        <div className={['flex min-h-0 flex-col overflow-hidden', activeTab !== 'guide' ? 'hidden lg:flex' : ''].join(' ')}>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Study Guide</div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ArchitectureStudyCard
              steps={scenario.steps}
              keyPoints={scenario.keyPoints || []}
              scenarioTitle={scenario.title}
            />
          </div>
        </div>

        {/* Canvas panel */}
        <div className={['flex min-h-0 flex-col overflow-hidden', activeTab !== 'draw' ? 'hidden lg:flex' : ''].join(' ')}>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Architecture Diagram</div>
          <div className="min-h-0 flex-1">
            <DiagramCanvas scenarioId={id} />
          </div>
        </div>

        {/* Notes panel */}
        <div className={['flex min-h-0 flex-col overflow-hidden', activeTab !== 'notes' ? 'hidden lg:flex' : ''].join(' ')}>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Your Notes</div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-zinc-900/50 transition-colors focus-within:border-teal-500/40">
            <div className="border-b border-white/[0.06] px-4 pt-4 pb-3">
              <h3 className="text-[14px] font-bold text-zinc-200">Write the flow</h3>
              <p className="text-[12px] text-zinc-600">Describe the architecture in your own words</p>
            </div>
            <textarea
              className="flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-zinc-300 outline-none placeholder:text-zinc-700"
              value={notes}
              onChange={handleNotesChange}
              placeholder="Start with the entry point... e.g. 'User hits the ALB → ingress routes to service → pod processes request...'"
            />
            <div className={['px-4 pb-3 text-[11px] text-green-500 transition-opacity duration-300', saved ? 'opacity-100' : 'opacity-0'].join(' ')}>
              Saved ✓
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
