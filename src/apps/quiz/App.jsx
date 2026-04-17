import { Routes, Route } from 'react-router-dom';
import './styles/index.css';
import QuizHome from './pages/QuizHome';
import QuizSession from './pages/QuizSession';
import Leaderboard from './pages/Leaderboard';

export default function App() {
  return (
    <div className="page-wrap">
      <Routes>
        <Route path="/"              element={<QuizHome />}    />
        <Route path=":categoryId"    element={<QuizSession />} />
        <Route path="leaderboard"    element={<Leaderboard />} />
      </Routes>
    </div>
  );
}
