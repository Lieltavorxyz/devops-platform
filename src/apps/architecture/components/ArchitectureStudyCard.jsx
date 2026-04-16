import { useState } from 'react'

export default function ArchitectureStudyCard({ steps = [], keyPoints = [], scenarioTitle }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showKeyPoints, setShowKeyPoints] = useState(false)

  const totalSteps = steps.length
  const currentStep = steps[currentIndex]

  function handleNext() {
    if (currentIndex < totalSteps - 1) setCurrentIndex(currentIndex + 1)
    else setShowKeyPoints(true)
  }
  function handlePrev() {
    if (showKeyPoints) setShowKeyPoints(false)
    else if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }
  function handleRestart() { setCurrentIndex(0); setShowKeyPoints(false) }

  if (showKeyPoints) {
    return (
      <div className="flex h-full flex-col gap-4 rounded-xl border border-white/[0.07] bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2 text-[18px] font-bold text-green-400">
          <span>✓</span><span>Scenario Complete</span>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {keyPoints.map((point, i) => (
            <div key={i} className="rounded-lg border-l-2 border-teal-500/60 bg-zinc-800/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-300">
              {point}
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.06] pt-3">
          <button
            onClick={handleRestart}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-[13px] font-semibold text-zinc-400 transition-colors hover:text-zinc-200"
          >
            ← Restart
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-white/[0.07] bg-zinc-900/50 p-5">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-wrap gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full border transition-all duration-150"
              style={{
                background: i <= currentIndex ? '#14b8a6' : 'transparent',
                borderColor: i <= currentIndex ? '#14b8a6' : 'rgba(255,255,255,0.15)',
                opacity: i < currentIndex ? 0.4 : 1,
              }}
            />
          ))}
        </div>
        <span className="shrink-0 text-[11px] text-zinc-600">
          Step {currentIndex + 1} of {totalSteps}
        </span>
      </div>

      {/* Step content */}
      <h2 className="text-[18px] font-bold leading-tight text-zinc-100">{currentStep.title}</h2>
      <p className="text-[13px] leading-relaxed text-zinc-400">{currentStep.description}</p>

      {currentStep.decisions?.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Decisions & Tradeoffs</div>
          <ul className="flex flex-col gap-1.5">
            {currentStep.decisions.map((dec, i) => (
              <li key={i} className="rounded-lg border-l-2 border-orange-500/50 bg-zinc-800/50 px-3 py-2 text-[12px] leading-relaxed text-zinc-400">
                ⚖️ {dec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {currentStep.components?.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Components</div>
          <div className="flex flex-wrap gap-1.5">
            {currentStep.components.map((comp, i) => (
              <span key={i} className="rounded-full border border-teal-500/25 bg-teal-950/30 px-2.5 py-1 text-[11px] font-semibold text-teal-400">
                {comp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-3">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="rounded-lg border border-white/[0.08] px-4 py-2 text-[13px] font-semibold text-zinc-400 transition-colors hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← Prev
        </button>
        <button
          onClick={handleNext}
          className="rounded-lg border border-teal-500/30 bg-teal-950/30 px-4 py-2 text-[13px] font-semibold text-teal-400 transition-colors hover:bg-teal-950/50"
        >
          {currentIndex < totalSteps - 1 ? 'Next →' : 'Finish →'}
        </button>
      </div>
    </div>
  )
}
