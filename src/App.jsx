import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TopBar from './shared/components/TopBar'

const KnowledgeApp = lazy(() => import('@knowledge/App'))
const QuizApp = lazy(() => import('@quiz/App'))
const ArchitectureApp = lazy(() => import('@architecture/App'))

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#09090b',
      color: '#71717a',
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
    }}>
      Loading...
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <TopBar />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Navigate to="/knowledge" replace />} />
          <Route path="/knowledge/*" element={<KnowledgeApp />} />
          <Route path="/quiz/*" element={<QuizApp />} />
          <Route path="/architecture/*" element={<ArchitectureApp />} />
          <Route path="*" element={<Navigate to="/knowledge" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
