import { useState } from 'react';
import { Link } from 'react-router-dom';
import { categories, questions } from '../data/quizData';
import { useScores } from '../../../shared/hooks/useScores';

const DIFFICULTIES = [
  { id: 'all',    label: 'All',    color: 'var(--text-2)',  dim: 'transparent'       },
  { id: 'easy',   label: 'Easy',   color: 'var(--green)',   dim: 'var(--green-dim)'  },
  { id: 'normal', label: 'Normal', color: 'var(--blue)',    dim: 'var(--blue-dim)'   },
  { id: 'hard',   label: 'Hard',   color: 'var(--orange)',  dim: 'var(--orange-dim)' },
  { id: 'expert', label: 'Expert', color: 'var(--purple)',  dim: 'var(--purple-dim)' },
];

const COLOR_MAP = {
  purple: { accent: 'var(--purple)', dim: 'var(--purple-dim)' },
  blue:   { accent: 'var(--blue)',   dim: 'var(--blue-dim)'   },
  orange: { accent: 'var(--orange)', dim: 'var(--orange-dim)' },
  green:  { accent: 'var(--green)',  dim: 'var(--green-dim)'  },
  teal:   { accent: 'var(--teal)',   dim: 'var(--teal-dim)'   },
  yellow: { accent: 'var(--yellow)', dim: 'var(--yellow-dim)' },
};

function getDiffCounts(categoryId) {
  const qs = questions.filter((q) => q.category === categoryId);
  const counts = { easy: 0, normal: 0, hard: 0, expert: 0 };
  qs.forEach((q) => { if (counts[q.difficulty] !== undefined) counts[q.difficulty]++; });
  return { total: qs.length, ...counts };
}

export default function QuizHome() {
  const [selectedDiff, setSelectedDiff] = useState('all');
  const { getPersonalBest } = useScores();

  const totalQuestions = selectedDiff === 'all'
    ? questions.length
    : questions.filter((q) => q.difficulty === selectedDiff).length;

  return (
    <div>
      {/* Header */}
      <div className="quiz-home-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>DevOps Quiz</h1>
            <p>Real interview questions across 6 domains</p>
          </div>
          <Link to="/quiz/leaderboard" className="btn-outline" style={{ marginTop: 4, fontSize: 13 }}>
            🏆 Leaderboard
          </Link>
        </div>
        <div className="quiz-home-meta">
          <span className="quiz-total-stat">{totalQuestions} questions</span>
          <div className="diff-filter-bar">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                className={`diff-filter-btn${selectedDiff === d.id ? ' diff-filter-btn--active' : ''}`}
                style={selectedDiff === d.id
                  ? { color: d.color, background: d.dim, borderColor: d.color }
                  : {}}
                onClick={() => setSelectedDiff(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category grid */}
      <div className="quiz-grid">
        {categories.map((cat) => {
          const colors = COLOR_MAP[cat.color] || COLOR_MAP.blue;
          const diff = getDiffCounts(cat.id);
          const count = selectedDiff === 'all' ? diff.total : diff[selectedDiff] || 0;
          const best = getPersonalBest(cat.id, selectedDiff === 'all' ? null : selectedDiff);
          const disabled = count === 0;
          const startTo = selectedDiff === 'all'
            ? `/quiz/${cat.id}`
            : `/quiz/${cat.id}?difficulty=${selectedDiff}`;

          return (
            <div
              key={cat.id}
              className="quiz-cat-card"
              style={{ '--cat-accent': colors.accent, '--cat-dim': colors.dim, opacity: disabled ? 0.45 : 1 }}
            >
              <div className="quiz-cat-card-header">
                <span className="quiz-cat-icon">{cat.icon}</span>
                <span className="quiz-cat-name">{cat.label}</span>
              </div>
              <p className="quiz-cat-desc">{cat.description}</p>
              <div className="quiz-cat-meta">
                <div>
                  <div className="quiz-cat-count">
                    {count} {count === 1 ? 'question' : 'questions'}
                    {selectedDiff !== 'all' && <> · <span style={{ color: colors.accent }}>{selectedDiff}</span></>}
                  </div>
                  {best && (
                    <div className="best-score-label">
                      Best: <span>{best.score}/{best.total} ({best.pct}%)</span>
                    </div>
                  )}
                </div>
                {selectedDiff === 'all' && (
                  <div className="quiz-diff-pills">
                    {diff.easy   > 0 && <span className="diff-pill easy">{diff.easy}</span>}
                    {diff.normal > 0 && <span className="diff-pill normal">{diff.normal}</span>}
                    {diff.hard   > 0 && <span className="diff-pill hard">{diff.hard}</span>}
                    {diff.expert > 0 && <span className="diff-pill expert">{diff.expert}</span>}
                  </div>
                )}
              </div>
              {disabled ? (
                <span className="quiz-start-btn quiz-start-btn--disabled">
                  No {selectedDiff} questions
                </span>
              ) : (
                <Link to={startTo} className="quiz-start-btn">
                  Start <span>→</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
