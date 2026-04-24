import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Target } from 'lucide-react';
import { useInterviewHistory } from '../hooks/useInterviewHistory';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { interviewQuestions } from '../data/questions';
import ScoreBreakdown from '../components/ScoreBreakdown';
import CategoryBreakdown from '../components/CategoryBreakdown';
import ShakyList from '../components/ShakyList';

function formatDuration(ms) {
  if (!ms || ms < 0) return '—';
  const total = Math.floor(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  if (mm === 0) return `${ss}s`;
  return `${mm}m ${ss.toString().padStart(2, '0')}s`;
}

export default function SessionSummary() {
  const navigate = useNavigate();
  const { lastSession } = useInterviewHistory();
  const { start } = useInterviewSession();

  // No session to show → go home.
  useEffect(() => {
    if (!lastSession) {
      navigate('/interview', { replace: true });
    }
  }, [lastSession, navigate]);

  const computed = useMemo(() => {
    if (!lastSession) return null;
    const ratings = lastSession.ratings || {};
    const queue = lastSession.queue || [];
    const values = Object.values(ratings);

    const counts = {
      nailed: values.filter((r) => r === 'nailed').length,
      ok: values.filter((r) => r === 'ok').length,
      shaky: values.filter((r) => r === 'shaky').length,
    };

    const byCategory = {};
    queue.forEach((qid) => {
      const q = interviewQuestions.find((x) => x.id === qid);
      if (!q) return;
      const rating = ratings[qid];
      if (!rating) return;
      if (!byCategory[q.category]) {
        byCategory[q.category] = { nailed: 0, ok: 0, shaky: 0, total: 0 };
      }
      byCategory[q.category][rating] = (byCategory[q.category][rating] || 0) + 1;
      byCategory[q.category].total += 1;
    });

    const shakyQuestions = queue
      .map((qid) => interviewQuestions.find((x) => x.id === qid))
      .filter((q) => q && ratings[q.id] === 'shaky');

    const duration = lastSession.finishedAt && lastSession.startedAt
      ? lastSession.finishedAt - lastSession.startedAt
      : null;

    return {
      counts,
      byCategory,
      shakyQuestions,
      totalRated: values.length,
      totalQuestions: queue.length,
      duration,
    };
  }, [lastSession]);

  if (!lastSession || !computed) return null;

  const handlePracticeAgain = () => {
    // Re-shuffle the same queue.
    const queue = [...(lastSession.queue || [])];
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    if (queue.length === 0) {
      navigate('/interview');
      return;
    }
    start(queue);
    navigate('/interview/session');
  };

  const handleFocusWeak = () => {
    const queue = computed.shakyQuestions.map((q) => q.id);
    if (queue.length === 0) return;
    start(queue);
    navigate('/interview/session');
  };

  const noWeak = computed.shakyQuestions.length === 0;

  return (
    <div className="iv-page">
      <div className="iv-summary-head">
        <h1>Session complete</h1>
        <p>
          <span><strong>{computed.totalQuestions}</strong> questions</span>
          <span>·</span>
          <span>{formatDuration(computed.duration)}</span>
          {computed.totalRated < computed.totalQuestions && (
            <>
              <span>·</span>
              <span>{computed.totalRated} rated</span>
            </>
          )}
        </p>
      </div>

      <div className="iv-summary-grid">
        <ScoreBreakdown counts={computed.counts} total={computed.totalQuestions} />
        <CategoryBreakdown byCategory={computed.byCategory} />
      </div>

      <ShakyList questions={computed.shakyQuestions} />

      <div className="iv-summary-cta-row">
        <button type="button" className="iv-cta-ghost" onClick={handlePracticeAgain}>
          <RotateCcw size={15} strokeWidth={2} />
          <span>Practice again</span>
        </button>
        <button
          type="button"
          className="iv-cta-primary"
          onClick={handleFocusWeak}
          disabled={noWeak}
        >
          <Target size={15} strokeWidth={2} />
          <span>
            {noWeak
              ? 'No weak spots'
              : `Focus on ${computed.shakyQuestions.length} weak spot${computed.shakyQuestions.length === 1 ? '' : 's'}`}
          </span>
        </button>
      </div>
    </div>
  );
}
