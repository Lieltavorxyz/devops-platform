import { Link } from 'react-router-dom';
import { categories, questions } from '../data/quizData';

const colorMap = {
  purple: { accent: 'var(--purple)', dim: 'var(--purple-dim)' },
  blue:   { accent: 'var(--blue)',   dim: 'var(--blue-dim)'   },
  orange: { accent: 'var(--orange)', dim: 'var(--orange-dim)' },
  green:  { accent: 'var(--green)',  dim: 'var(--green-dim)'  },
  teal:   { accent: 'var(--teal)',   dim: 'var(--teal-dim)'   },
  yellow: { accent: 'var(--yellow)', dim: 'var(--yellow-dim)' },
};

function getDifficultyCounts(categoryId) {
  const catQuestions = questions.filter(q => q.category === categoryId);
  const counts = { beginner: 0, intermediate: 0, advanced: 0 };
  catQuestions.forEach(q => {
    if (counts[q.difficulty] !== undefined) counts[q.difficulty]++;
  });
  return { total: catQuestions.length, ...counts };
}

export default function QuizHome() {
  const totalQuestions = questions.length;

  const getBest = (catId) => {
    try {
      const raw = localStorage.getItem(`quiz_best_${catId}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  return (
    <div>
      <div className="quiz-home-header">
        <h1>DevOps Quiz</h1>
        <p>Test your knowledge with real interview questions</p>
        <span className="quiz-total-stat">{totalQuestions} questions</span>
      </div>

      <div className="quiz-grid">
        {categories.map(cat => {
          const colors = colorMap[cat.color] || colorMap.blue;
          const diff = getDifficultyCounts(cat.id);

          return (
            <div
              key={cat.id}
              className="quiz-cat-card"
              style={{ '--cat-accent': colors.accent, '--cat-dim': colors.dim }}
            >
              <div className="quiz-cat-card-header">
                <span className="quiz-cat-icon">{cat.icon}</span>
                <span className="quiz-cat-name">{cat.label}</span>
              </div>
              <p className="quiz-cat-desc">{cat.description}</p>
              <div className="quiz-cat-meta">
                <div>
                  <span className="quiz-cat-count">{diff.total} questions</span>
                  {(() => { const best = getBest(cat.id); return best ? (
                    <div className="best-score-label">Best: <span>{best.score}/{best.total} ({best.pct}%)</span></div>
                  ) : null; })()}
                </div>
                <div className="quiz-diff-pills">
                  {diff.beginner > 0 && (
                    <span className="diff-pill beginner">{diff.beginner} beginner</span>
                  )}
                  {diff.intermediate > 0 && (
                    <span className="diff-pill intermediate">{diff.intermediate} intermediate</span>
                  )}
                  {diff.advanced > 0 && (
                    <span className="diff-pill advanced">{diff.advanced} advanced</span>
                  )}
                </div>
              </div>
              <Link to={`/quiz/${cat.id}`} className="quiz-start-btn">
                Start <span>&rarr;</span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
