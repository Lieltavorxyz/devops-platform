import { Routes, Route } from 'react-router-dom'
import './styles/index.css'
import PracticeHome from './pages/PracticeHome'
import PracticeSession from './pages/PracticeSession'

export default function App() {
  return (
    <div className="min-h-screen bg-[#09090b] pt-12">
      <Routes>
        <Route path="/" element={
          <div className="mx-auto max-w-[1100px] px-6 py-10">
            <PracticeHome />
          </div>
        } />
        <Route path="practice/:id" element={<PracticeSession />} />
      </Routes>
    </div>
  )
}
