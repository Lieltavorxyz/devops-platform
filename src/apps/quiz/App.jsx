import { Routes, Route } from 'react-router-dom'
import './styles/index.css'
import QuizHome from './pages/QuizHome'
import QuizSession from './pages/QuizSession'

export default function App() {
  return (
    <div className="min-h-screen bg-[#09090b] pt-12">
      <div className="mx-auto max-w-[960px] px-6 py-10">
        <Routes>
          <Route path="/" element={<QuizHome />} />
          <Route path=":categoryId" element={<QuizSession />} />
        </Routes>
      </div>
    </div>
  )
}
