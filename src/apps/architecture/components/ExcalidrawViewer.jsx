import { lazy, Suspense, useMemo } from 'react';
import { generateDiagramElements } from '../utils/diagramGenerator';

const ExcalidrawComponent = lazy(() =>
  import('@excalidraw/excalidraw').then(mod => ({ default: mod.Excalidraw }))
);

export default function ExcalidrawViewer({ scenario }) {
  const elements = useMemo(() => generateDiagramElements(scenario), [scenario]);

  const initialData = useMemo(() => ({
    elements,
    appState: {
      viewBackgroundColor: '#09090b',
      theme: 'dark',
      viewModeEnabled: true,
      gridSize: null,
      zoom: { value: 0.85 },
    },
    scrollToContent: true,
  }), [elements]);

  return (
    <div className="diagram-canvas-wrap">
      <Suspense fallback={
        <div className="diagram-loading">
          <div className="diagram-loading-spinner" />
          <span>Loading reference...</span>
        </div>
      }>
        <ExcalidrawComponent
          initialData={initialData}
          viewModeEnabled={true}
          theme="dark"
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: false,
              toggleTheme: false,
              changeViewBackgroundColor: false,
              clearCanvas: false,
            },
            tools: { image: false },
          }}
        />
      </Suspense>
    </div>
  );
}
