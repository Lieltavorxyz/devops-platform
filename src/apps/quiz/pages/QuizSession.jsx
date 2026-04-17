import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Flashcard from '../components/Flashcard';
import { categories, questions } from '../data/quizData';
import { useQuizStorage } from '../hooks/useQuizStorage';
import { useScores } from '../../../shared/hooks/useScores';

const DIFF_LABEL = { easy: 'Easy', normal: 'Normal', hard: 'Hard', expert: 'Expert' };
const DIFF_COLOR = { easy: 'var(--green)', normal: 'var(--blue)', hard: 'var(--orange)', expert: 'var(--purple)' };

export default function QuizSession() {
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const difficulty = searchParams.get('difficulty');

  const category = categories.find((c) => c.id === categoryId);
  const categoryQuestions = useMemo(() => {
    const all = questions.filter((q) => q.category === categoryId);
    return difficulty ? all.filter((q) => q.difficulty === difficulty) : all;
  }, [categoryId, difficulty]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [results, setResults] = useState([]);
  const [phase, setPhase] = useState('quiz');
  const [showResume, setShowResume] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [nickname, setNickname] = useState(() => {
    try { return localStorage.getItem('quiz_nickname') || ''; } catch (_) { return ''; }
  });
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const storageKey = difficulty ? `${categoryId}_${difficulty}` : categoryId;
  const { loadProgress, saveProgress, clearProgress, saveBest, updateStats } = useQuizStorage(storageKey);
  const { submitScore } = useScores();

  useEffect(() => {
    const progress = loadProgress();
    if (progress && progress.phase === 'quiz') {
      setSavedProgress(progress);
      setShowResume(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const total = categoryQuestions.length;
  const current = categoryQuestions[currentIndex];
  const progressPct = total > 0 ? (currentIndex / total) * 100 : 0;

  const handleReveal = useCallback(() => {
    setRevealed(true);
  }, []);

  const handleRate = useCallback(
    (correct) => {
      const newResults = [...results, { questionId: current.id, correct }];
      setResults(newResults);
      setRevealed(false);
      setWrittenAnswer('');

      if (currentIndex + 1 >= total) {
        setTimeout(async () => {
          const score = newResults.filter((r) => r.correct).length;
          clearProgress();
          saveBest(score, total);
          updateStats(score, total);
          setPhase('results');

          if (difficulty && !scoreSubmitted) {
            setScoreSubmitted(true);
            await submitScore({ category: categoryId, difficulty, score, total, nickname });
          }
        }, 350);
      } else {
        const nextIndex = currentIndex + 1;
        saveProgress({ currentIndex: nextIndex, results: newResults, phase: 'quiz' });
        setTimeout(() => setCurrentIndex(nextIndex), 350);
      }
    },
    [results, current, currentIndex, total, clearProgress, saveBest, updateStats,
     saveProgress, difficulty, scoreSubmitted, submitScore, categoryId, nickname]
  );

  const handleRetry = useCallback(() => {
    setCurrentIndex(0);
    setRevealed(false);
    setWrittenAnswer('');
    setResults([]);
    setPhase('quiz');
    setScoreSubmitted(false);
  }, []);

  const handleNicknameChange = useCallback((e) => {
    const val = e.target.value.slice(0, 32);
    setNickname(val);
    try { localStorage.setItem('quiz_nickname', val); } catch (_) {}
  }, []);

  const tagStats = useMemo(() => {
    if (phase !== 'results') return { strong: [], weak: [] };
    const tagMap = {};
    results.forEach((r) => {
      const q = categoryQuestions.find((cq) => cq.id === r.questionId);
      if (!q) return;
      q.tags.forEach((tag) => {
        if (!tagMap[tag]) tagMap[tag] = { correct: 0, total: 0 };
        tagMap[tag].total += 1;
        if (r.correct) tagMap[tag].correct += 1;
      });
    });
    const strong = [];
    const weak = [];
    Object.entries(tagMap).forEach(([tag, s]) => {
      const pct = s.correct / s.total;
      if (pct > 0.7) strong.push(tag);
      else if (pct < 0.5) weak.push(tag);
    });
    return { strong, weak };
  }, [phase, results, categoryQuestions]);

  if (!category || total === 0) {
    return (
      <div style={{ color: 'var(--text-2)', textAlign: 'center', paddingTop: 80 }}>
        <p>No questions found for this selection.</p>
        <Link to="/quiz" className="btn-outline" style={{ marginTop: 16, display: 'inline-flex' }}>
          ← Back to categories
        </Link>
      </div>
    );
  }

  if (phase === 'results') {
    const score = results.filter((r) => r.correct).length;
    const pct = Math.round((score / total) * 100);
    const tier = pct >= 80 ? 'great' : pct >= 50 ? 'ok' : 'poor';

    return (
      <div className="quiz-results">
        <div className={`results-score-big ${tier}`}>{score}/{total}</div>
        <div className="results-pct">{pct}% correct</div>

        {difficulty && (
          <div style={{ marginBottom: 20 }}>
            <span
              className="diff-pill"
              style={{
                color: DIFF_COLOR[difficulty],
                background: `${DIFF_COLOR[difficulty]}20`,
                border: `1px solid ${DIFF_COLOR[difficulty]}40`,
                padding: '4px 12px',
                fontSize: 12,
              }}
            >
              {DIFF_LABEL[difficulty]} difficulty
            </span>
          </div>
        )}

        {difficulty && (
          <div className="results-nickname-row">
            <label className="quiz-label" htmlFor="nickname-input">Your name on the leaderboard:</label>
            <input
              id="nickname-input"
              className="results-nickname-input"
              type="text"
              maxLength={32}
              placeholder="Anonymous"
              value={nickname}
              onChange={handleNicknameChange}
            />
            <Link
              to={`/quiz/leaderboard?category=${categoryId}&difficulty=${difficulty}`}
              className="btn-outline"
              style={{ fontSize: 13 }}
            >
              View Leaderboard →
            </Link>
          </div>
        )}

        {(tagStats.strong.length > 0 || tagStats.weak.length > 0) && (
          <div className="results-tags-section">
            {tagStats.strong.length > 0 && (
              <div className="results-tag-group strong">
                <h4>Strong areas</h4>
                <div className="results-tag-pills">
                  {tagStats.strong.map((tag) => (
                    <span key={tag} className="results-tag-pill">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {tagStats.weak.length > 0 && (
              <div className="results-tag-group weak">
                <h4>Needs work</h4>
                <div className="results-tag-pills">
                  {tagStats.weak.map((tag) => (
                    <span key={tag} className="results-tag-pill">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="results-actions">
          <button className="btn-primary-quiz" onClick={handleRetry}>Retry</button>
          <Link to="/quiz" className="btn-outline">← Back to categories</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {showResume && savedProgress && (
        <div className="resume-banner">
          <p>
            You left off at card <strong>{savedProgress.currentIndex + 1}</strong> of{' '}
            <strong>{total}</strong> — resume or start over?
          </p>
          <div className="resume-banner-btns">
            <button
              className="primary"
              onClick={() => {
                setCurrentIndex(savedProgress.currentIndex);
                setResults(savedProgress.results);
                setShowResume(false);
              }}
            >
              Resume
            </button>
            <button onClick={() => { clearProgress(); setShowResume(false); }}>
              Start over
            </button>
          </div>
        </div>
      )}

      {/* Session header */}
      <div className="quiz-session-header">
        <div className="quiz-progress-bar-wrap">
          <div
            className="quiz-progress-bar-fill"
            style={{
              width: `${progressPct}%`,
              background: difficulty ? DIFF_COLOR[difficulty] : `var(--${category.color})`,
            }}
          />
        </div>
        <div className="quiz-progress-meta">
          <span>
            <strong>{currentIndex + 1}</strong> / <strong>{total}</strong>
          </span>
          <span>
            {category.icon} {category.label}
            {difficulty && (
              <span style={{ marginLeft: 8, color: DIFF_COLOR[difficulty], fontSize: 11, fontWeight: 700 }}>
                · {DIFF_LABEL[difficulty]}
              </span>
            )}
          </span>
          <Link to="/quiz" className="quiz-exit-link">✕</Link>
        </div>
      </div>

      {/* Flashcard */}
      <Flashcard
        question={current.question}
        answer={current.answer}
        hint={current.hint}
        revealed={revealed}
        writtenAnswer={writtenAnswer}
        categoryColor={category.color}
      />

      {/* Answer area / rate buttons */}
      {!revealed ? (
        <div className="quiz-answer-area">
          <label className="quiz-label" htmlFor="answer-input">Your answer</label>
          <textarea
            id="answer-input"
            className="quiz-textarea"
            placeholder="Type your answer… or flip to see it directly"
            value={writtenAnswer}
            onChange={(e) => setWrittenAnswer(e.target.value)}
            rows={4}
          />
          <div className="quiz-answer-btns">
            <button className="btn-flip-skip" type="button" onClick={handleReveal}>
              Flip to see answer
            </button>
            <button
              className="btn-reveal-answer"
              type="button"
              onClick={handleReveal}
              disabled={writtenAnswer.trim().length === 0}
            >
              Reveal answer →
            </button>
          </div>
        </div>
      ) : (
        <div className="quiz-rate-btns">
          <button className="btn-missed" type="button" onClick={() => handleRate(false)}>
            ✗ Missed it
          </button>
          <button className="btn-got-it" type="button" onClick={() => handleRate(true)}>
            ✓ Got it
          </button>
        </div>
      )}
    </>
  );
}
