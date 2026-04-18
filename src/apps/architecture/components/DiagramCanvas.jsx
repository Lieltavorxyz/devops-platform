import { lazy, Suspense, useState, useCallback, useRef, useEffect } from 'react';

const ExcalidrawComponent = lazy(() =>
  import('@excalidraw/excalidraw').then(mod => ({ default: mod.Excalidraw }))
);

export default function DiagramCanvas({ scenarioId }) {
  const storageKey = `arch_diagram_${scenarioId}`;

  const loadSaved = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const [savedData] = useState(loadSaved);
  const pendingRef = useRef(null);
  const timerRef = useRef(null);

  // Auto-save every 10s (debounced — resets on each change)
  const handleChange = useCallback((elements) => {
    if (!elements || elements.length === 0) return;
    pendingRef.current = elements;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(pendingRef.current));
      } catch {}
    }, 10000);
  }, [storageKey]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div className="diagram-canvas-wrap">
      <Suspense fallback={
        <div className="diagram-loading">
          <div className="diagram-loading-spinner" />
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
  );
}
