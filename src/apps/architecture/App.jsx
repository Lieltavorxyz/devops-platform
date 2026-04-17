import { Routes, Route } from 'react-router-dom';
import './styles/index.css';
import PracticeHome from './pages/PracticeHome';
import PracticeSession from './pages/PracticeSession';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div className="page-wrap"><PracticeHome /></div>} />
      <Route path="practice/:id" element={<PracticeSession />} />
    </Routes>
  );
}
