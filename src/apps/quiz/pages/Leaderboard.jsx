import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { categories } from '../data/quizData';
import { useScores } from '../../../shared/hooks/useScores';

const DIFFICULTIES = ['easy', 'normal', 'hard', 'expert'];
const DIFF_COLOR = { easy: 'var(--green)', normal: 'var(--blue)', hard: 'var(--orange)', expert: 'var(--purple)' };
const DIFF_DIM   = { easy: 'var(--green-dim)', normal: 'var(--blue-dim)', hard: 'var(--orange-dim)', expert: 'var(--purple-dim)' };

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [searchParams] = useSearchParams();
  const initCat  = searchParams.get('category')   || categories[0].id;
  const initDiff = searchParams.get('difficulty')  || 'normal';

  const [selectedCat, setSelectedCat]   = useState(initCat);
  const [selectedDiff, setSelectedDiff] = useState(initDiff);
  const [entries, setEntries] = useState([]);
  const [source, setSource]  = useState('remote'); // 'remote' | 'local'
  const [loading, setLoading] = useState(true);

  const { getLeaderboard } = useScores();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getLeaderboard(selectedCat, selectedDiff, 10).then(({ items, source: src }) => {
      if (!cancelled) {
        setEntries(items);
        setSource(src);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [selectedCat, selectedDiff]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentCat = categories.find((c) => c.id === selectedCat);

  return (
    <div>
      {/* Header */}
      <div className="quiz-home-header" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>🏆 Leaderboard</h1>
            <p>Top scores per category and difficulty</p>
          </div>
          <Link to="/quiz" className="btn-outline" style={{ fontSize: 13 }}>
            ← Back to quiz
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {/* Category tabs */}
        <div className="lb-cat-tabs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`lb-cat-tab${selectedCat === cat.id ? ' lb-cat-tab--active' : ''}`}
              onClick={() => setSelectedCat(cat.id)}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Difficulty tabs */}
        <div className="diff-filter-bar">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={`diff-filter-btn${selectedDiff === d ? ' diff-filter-btn--active' : ''}`}
              style={selectedDiff === d ? { color: DIFF_COLOR[d], background: DIFF_DIM[d], borderColor: DIFF_COLOR[d] } : {}}
              onClick={() => setSelectedDiff(d)}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="lb-table-wrap">
        {/* Table header */}
        <div className="lb-table-header">
          <span style={{ color: DIFF_COLOR[selectedDiff] }}>
            {currentCat?.icon} {currentCat?.label} · {selectedDiff.charAt(0).toUpperCase() + selectedDiff.slice(1)}
          </span>
          {source === 'local' && (
            <span className="lb-offline-badge">offline — local data</span>
          )}
        </div>

        {loading ? (
          <div className="lb-empty">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="lb-empty">
            <p>No scores yet.</p>
            <Link to={`/quiz/${selectedCat}?difficulty=${selectedDiff}`} className="btn-primary-quiz" style={{ marginTop: 12, display: 'inline-block' }}>
              Be the first →
            </Link>
          </div>
        ) : (
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Score</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id || i} className={i < 3 ? 'lb-row-top' : ''}>
                  <td className="lb-rank">
                    {i < 3 ? MEDAL[i] : <span style={{ color: 'var(--text-3)' }}>{i + 1}</span>}
                  </td>
                  <td className="lb-name">{entry.nickname || 'Anonymous'}</td>
                  <td className="lb-score">{entry.score}/{entry.total}</td>
                  <td className="lb-pct" style={{ color: entry.pct >= 80 ? 'var(--green)' : entry.pct >= 50 ? 'var(--orange)' : 'var(--red)' }}>
                    {entry.pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
