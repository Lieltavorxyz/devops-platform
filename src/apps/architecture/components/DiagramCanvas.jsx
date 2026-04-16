import { lazy, Suspense, useState, useCallback } from 'react';

// Lazy load the actual Excalidraw component
const ExcalidrawComponent = lazy(() =>
  import('@excalidraw/excalidraw').then(mod => ({ default: mod.Excalidraw }))
);

export default function DiagramCanvas({ scenarioId }) {
  const storageKey = `arch_diagram_${scenarioId}`;

  // Load saved elements from localStorage
  const loadSaved = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const [savedData] = useState(loadSaved);

  const handleChange = useCallback((elements, appState) => {
    // Save on every change (debounce would be ideal but keep it simple)
    try {
      // Only save non-empty canvases
      if (elements && elements.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(elements));
      }
    } catch {}
  }, [storageKey]);

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
