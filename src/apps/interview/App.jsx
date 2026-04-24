import { Routes, Route } from 'react-router-dom';
import InterviewHome from './pages/InterviewHome';
import SessionPage from './pages/SessionPage';
import SessionSummary from './pages/SessionSummary';
import './styles/index.css';

export default function InterviewApp() {
  return (
    <Routes>
      <Route path="/"        element={<InterviewHome />} />
      <Route path="session"  element={<SessionPage />} />
      <Route path="summary"  element={<SessionSummary />} />
    </Routes>
  );
}
