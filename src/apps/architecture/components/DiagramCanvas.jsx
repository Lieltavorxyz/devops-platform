import { lazy, Suspense, useState, useCallback } from 'react'

const ExcalidrawComponent = lazy(() =>
  import('@excalidraw/excalidraw').then(mod => ({ default: mod.Excalidraw }))
)

export default function DiagramCanvas({ scenarioId }) {
  const storageKey = `arch_diagram_${scenarioId}`

  const loadSaved = () => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  const [savedData] = useState(loadSaved)

  const handleChange = useCallback((elements) => {
    try {
      if (elements && elements.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(elements))
      }
    } catch {}
  }, [storageKey])

  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-white/[0.07] bg-zinc-900/50" style={{ minHeight: 400 }}>
      <Suspense fallback={
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[13px] text-zinc-600">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-700 border-t-teal-500" />
          <span>Loading canvas...</span>
        </div>
      }>
        <ExcalidrawComponent
          initialData={savedData ? { elements: savedData } : undefined}
          onChange={handleChange}
          theme="dark"
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: false,
              toggleTheme: false,
            },
          }}
        />
      </Suspense>
    </div>
  )
}
