import { Routes, Route } from 'react-router-dom';
import './styles/index.css';
import TopBar from './components/TopBar';
import PracticeHome from './pages/PracticeHome';
import PracticeSession from './pages/PracticeSession';

export default function App() {
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/" element={<div className="page-wrap"><PracticeHome /></div>} />
        <Route path="practice/:id" element={<PracticeSession />} />
      </Routes>
    </>
  );
}
