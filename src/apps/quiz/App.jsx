import { Routes, Route } from 'react-router-dom';
import './styles/index.css';
import TopBar from './components/TopBar';
import QuizHome from './pages/QuizHome';
import QuizSession from './pages/QuizSession';

export default function App() {
  return (
    <>
      <TopBar />
      <div className="page-wrap">
        <Routes>
          <Route path="/" element={<QuizHome />} />
          <Route path=":categoryId" element={<QuizSession />} />
        </Routes>
      </div>
    </>
  );
}
