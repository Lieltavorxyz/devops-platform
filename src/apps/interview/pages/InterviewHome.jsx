import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessagesSquare, Shuffle, History, ArrowRight } from 'lucide-react';
import { interviewCategories, interviewQuestions } from '../data/questions';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { useInterviewHistory } from '../hooks/useInterviewHistory';
import CategoryCard from '../components/CategoryCard';

const DIFF_FILTERS = [
  { id: 'all',    label: 'All' },
  { id: 'mid',    label: 'Mid' },
  { id: 'senior', label: 'Senior' },
];

const FILTER_KEY = 'interview.filter';
const QUICK_SIZE = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function InterviewHome() {
  const navigate = useNavigate();
  const { start } = useInterviewSession();
  const { lastSession } = useInterviewHistory();

  const [filter, setFilter] = useState(() => {
    try {
      return localStorage.getItem(FILTER_KEY) || 'all';
    } catch {
      return 'all';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, filter);
    } catch {
      // ignore
    }
  }, [filter]);

  const matchesFilter = useCallback(
    (q) => filter === 'all' || q.level === filter,
    [filter],
  );

  const countsByCategory = useMemo(() => {
    const map = {};
    interviewCategories.forEach((c) => {
      map[c.id] = { total: 0, mid: 0, senior: 0 };
    });
    interviewQuestions.forEach((q) => {
      if (!map[q.category]) return;
      if (!matchesFilter(q)) return;
      map[q.category].total += 1;
      if (q.level === 'mid') map[q.category].mid += 1;
      if (q.level === 'senior') map[q.category].senior += 1;
    });
    return map;
  }, [matchesFilter]);

  const totalQuestions = interviewQuestions.filter(matchesFilter).length;

  const handleStartCategory = useCallback(
    (categoryId) => {
      const pool = interviewQuestions
        .filter((q) => q.category === categoryId && matchesFilter(q))
        .map((q) => q.id);
      if (pool.length === 0) return;
      start(shuffle(pool));
      navigate('/interview/session');
    },
    [matchesFilter, start, navigate],
  );

  const handleQuickPractice = useCallback(() => {
    const pool = interviewQuestions.filter(matchesFilter).map((q) => q.id);
    if (pool.length === 0) return;
    const queue = shuffle(pool).slice(0, Math.min(QUICK_SIZE, pool.length));
    start(queue);
    navigate('/interview/session');
  }, [matchesFilter, start, navigate]);

  return (
    <div className="iv-page">
      <div className="iv-hero">
        <span className="iv-hero-eyebrow">
          <MessagesSquare size={12} strokeWidth={2.5} />
          Interview Practice
        </span>
        <h1>Senior DevOps Interview Prep</h1>
        <p className="iv-hero-sub">
          Think first. Answer out loud. Reveal only when you&rsquo;ve committed to a
          structure. You learn far more from the gap between what you said and what
          the model answer covers than from passively reading.
        </p>
      </div>

      <div className="iv-actions-row">
        <div className="iv-filter-group">
          <span className="iv-filter-label">Level</span>
          <div className="iv-filter-bar">
            {DIFF_FILTERS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`iv-filter-btn${filter === d.id ? ' iv-filter-btn--active' : ''}`}
                onClick={() => setFilter(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <span className="iv-filter-label" style={{ color: 'var(--text-3)' }}>
            {totalQuestions} questions
          </span>
        </div>

        <button
          type="button"
          className="iv-quick-btn"
          onClick={handleQuickPractice}
          disabled={totalQuestions === 0}
        >
          <Shuffle size={16} strokeWidth={2} />
          <span>Quick practice ({Math.min(QUICK_SIZE, totalQuestions)})</span>
        </button>
      </div>

      {lastSession && (
        <RecentSessionCard session={lastSession} />
      )}

      <div className="iv-grid">
        {interviewCategories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            counts={countsByCategory[cat.id]}
            onStart={handleStartCategory}
          />
        ))}
      </div>
    </div>
  );
}

function RecentSessionCard({ session }) {
  const navigate = useNavigate();
  const ratings = session.ratings || {};
  const values = Object.values(ratings);
  const nailed = values.filter((r) => r === 'nailed').length;
  const ok = values.filter((r) => r === 'ok').length;
  const shaky = values.filter((r) => r === 'shaky').length;
  const totalQs = session.queue?.length || values.length;
  const when = session.finishedAt
    ? new Date(session.finishedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'recently';

  return (
    <button
      type="button"
      className="iv-recent"
      onClick={() => navigate('/interview/summary')}
      style={{
        border: 'none',
        textAlign: 'left',
        width: '100%',
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: 'inherit',
      }}
    >
      <div className="iv-recent-left">
        <span className="iv-recent-icon">
          <History size={16} strokeWidth={2} />
        </span>
        <div>
          <div className="iv-recent-title">Last session · {when}</div>
          <div className="iv-recent-meta">
            <span><strong>{totalQs}</strong> questions</span>
            <span style={{ color: 'var(--rating-nailed)' }}>{nailed} nailed</span>
            <span style={{ color: 'var(--rating-ok)' }}>{ok} got it</span>
            <span style={{ color: 'var(--rating-shaky)' }}>{shaky} shaky</span>
          </div>
        </div>
      </div>
      <span className="iv-recent-cta">
        View summary
        <ArrowRight size={14} strokeWidth={2} />
      </span>
    </button>
  );
}
