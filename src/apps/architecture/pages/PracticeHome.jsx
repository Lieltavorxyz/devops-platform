import { useNavigate } from 'react-router-dom';
import { scenarios } from '../data/architectureScenarios';

const DIFF_COLORS = {
  beginner: 'var(--green)',
  intermediate: 'var(--orange)',
  advanced: 'var(--red)',
};

function diffCount(level) {
  return scenarios.filter(s => s.difficulty === level).length;
}

export default function PracticeHome() {
  const navigate = useNavigate();
  const total = scenarios.length;

  return (
    <>
      <div className="practice-home-header">
        <h1>Architecture Practice</h1>
        <p>Step-by-step system design scenarios with drawing canvas</p>
        <div className="practice-stats-row">
          <span className="practice-stat-pill">{total} scenarios</span>
          <span className="practice-stat-pill" style={{ color: 'var(--green)' }}>
            {diffCount('beginner')} beginner
          </span>
          <span className="practice-stat-pill" style={{ color: 'var(--orange)' }}>
            {diffCount('intermediate')} intermediate
          </span>
          <span className="practice-stat-pill" style={{ color: 'var(--red)' }}>
            {diffCount('advanced')} advanced
          </span>
        </div>
      </div>

      <div className="practice-grid">
        {scenarios.map(scenario => {
          const diffColor = DIFF_COLORS[scenario.difficulty] || 'var(--teal)';
          return (
            <div
              key={scenario.id}
              className="practice-card"
              style={{ '--diff-color': diffColor, cursor: 'pointer' }}
              onClick={() => navigate(`/practice/${scenario.id}`)}
            >
              <div className="practice-card-top">
                <span className="practice-card-title">{scenario.title}</span>
                <span className={`diff-badge ${scenario.difficulty}`}>
                  {scenario.difficulty}
                </span>
              </div>

              <p className="practice-card-desc">{scenario.description}</p>

              <div className="practice-card-tags">
                {scenario.tags.map(tag => (
                  <span key={tag} className="practice-tag">{tag}</span>
                ))}
              </div>

              <div className="practice-card-meta">
                <div className="practice-meta-info">
                  <span>~{scenario.estimatedMinutes} min</span>
                  <span>{scenario.steps.length} steps</span>
                </div>
                <span className="practice-start-btn">
                  Start Practice →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
