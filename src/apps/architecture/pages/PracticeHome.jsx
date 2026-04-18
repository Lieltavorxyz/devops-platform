import { Link } from 'react-router-dom';
import { scenarios } from '../data/architectureScenarios';

const DIFF_COLORS = {
  easy:   { color: 'var(--green)',  dim: 'var(--green-dim)'  },
  normal: { color: 'var(--blue)',   dim: 'var(--blue-dim)'   },
  hard:   { color: 'var(--orange)', dim: 'var(--orange-dim)' },
  expert: { color: 'var(--purple)', dim: 'var(--purple-dim)' },
};

const DIFF_LABELS = { easy: 'Easy', normal: 'Normal', hard: 'Hard', expert: 'Expert' };

function diffCount(level) {
  return scenarios.filter(s => s.difficulty === level).length;
}

export default function PracticeHome() {
  const total = scenarios.length;

  return (
    <>
      <div className="arch-home-header">
        <h1>Architecture Practice</h1>
        <p>Step-by-step system design scenarios with drawing canvas</p>
        <div className="arch-stats-row">
          <span className="arch-stat-pill">{total} scenarios</span>
          {diffCount('easy')   > 0 && <span className="arch-stat-pill easy">{diffCount('easy')} easy</span>}
          {diffCount('normal') > 0 && <span className="arch-stat-pill normal">{diffCount('normal')} normal</span>}
          {diffCount('hard')   > 0 && <span className="arch-stat-pill hard">{diffCount('hard')} hard</span>}
          {diffCount('expert') > 0 && <span className="arch-stat-pill expert">{diffCount('expert')} expert</span>}
        </div>
      </div>

      <div className="arch-grid">
        {scenarios.map(scenario => {
          const dc = DIFF_COLORS[scenario.difficulty] || DIFF_COLORS.normal;
          return (
            <div
              key={scenario.id}
              className="arch-card"
              style={{ '--diff-color': dc.color, '--diff-dim': dc.dim }}
            >
              <div className="arch-card-top">
                <span className="arch-card-title">{scenario.title}</span>
                <span
                  className="arch-diff-badge"
                  style={{ color: dc.color, background: dc.dim }}
                >
                  {DIFF_LABELS[scenario.difficulty] || scenario.difficulty}
                </span>
              </div>

              <p className="arch-card-desc">{scenario.description}</p>

              <div className="arch-card-tags">
                {scenario.tags.map(tag => (
                  <span key={tag} className="arch-tag">{tag}</span>
                ))}
              </div>

              <div className="arch-card-footer">
                <span className="arch-card-meta">
                  ⏱ {scenario.estimatedMinutes} min · {scenario.steps.length} steps
                </span>
                <Link to={`/architecture/practice/${scenario.id}`} className="arch-start-btn">
                  Start <span>→</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
