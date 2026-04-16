import { useState, useEffect } from 'react'

export default function Flashcard({
  question, answer, hint, flipped, onFlip,
  categoryColor = 'blue', mode = 'flip',
  onReveal, revealed = false, writtenAnswer = '',
}) {
  const [showHint, setShowHint] = useState(false)

  useEffect(() => { setShowHint(false) }, [question])

  const handleHintClick = (e) => { e.stopPropagation(); setShowHint(p => !p) }

  if (mode === 'write') {
    return (
      <div className="my-2 rounded-xl border border-white/[0.08] bg-zinc-900/60">
        {!revealed ? (
          <div className="flex flex-col items-center gap-4 px-8 py-10 text-center">
            <p className="text-[18px] font-semibold leading-relaxed text-zinc-100">{question}</p>
            {hint && (
              <>
                <button
                  onClick={handleHintClick}
                  className="rounded-lg border border-white/[0.08] bg-zinc-800/60 px-3.5 py-1.5 text-[12px] font-medium text-zinc-400 transition-colors hover:text-zinc-200"
                >
                  💡 {showHint ? 'Hide hint' : 'Show hint'}
                </button>
                {showHint && (
                  <div className="rounded-lg border border-white/[0.07] bg-zinc-800/60 px-4 py-2.5 text-[13px] text-zinc-400">
                    {hint}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Question</div>
            <p className="text-[14px] font-medium text-zinc-300">{question}</p>
            <div className="grid grid-cols-[1fr_1px_1fr] gap-0 overflow-hidden rounded-xl border border-white/[0.07]">
              <div className="bg-zinc-900/60 p-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Your answer</div>
                <div className="text-[13px] leading-relaxed text-zinc-300">{writtenAnswer}</div>
              </div>
              <div className="bg-white/[0.06]" />
              <div className="bg-green-950/30 p-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-green-600">Correct answer</div>
                <div className="text-[13px] leading-relaxed text-green-300">{answer}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Flip mode — requires 3D CSS (in index.css)
  return (
    <div className="flashcard-scene" onClick={onFlip}>
      <div className={`flashcard${flipped ? ' is-flipped' : ''}`}>
        {/* Front */}
        <div className="flashcard-face flashcard-front">
          <p className="text-[18px] font-semibold leading-relaxed text-zinc-100">{question}</p>
          {hint && (
            <>
              <button
                onClick={handleHintClick}
                className="mt-4 rounded-lg border border-white/[0.08] bg-zinc-800/60 px-3.5 py-1.5 text-[12px] font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                💡 {showHint ? 'Hide hint' : 'Show hint'}
              </button>
              {showHint && (
                <div className="mt-2 rounded-lg border border-white/[0.07] bg-zinc-800/60 px-4 py-2.5 text-[13px] text-zinc-400">
                  {hint}
                </div>
              )}
            </>
          )}
          <p className="mt-auto pt-6 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
            Tap to reveal answer
          </p>
        </div>
        {/* Back */}
        <div className="flashcard-face flashcard-back">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Answer</div>
          <p className="mb-4 text-[13px] text-zinc-400">{question}</p>
          <p className="text-[15px] leading-relaxed text-zinc-100">{answer}</p>
        </div>
      </div>
    </div>
  )
}
