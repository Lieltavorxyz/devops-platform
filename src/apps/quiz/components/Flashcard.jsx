import { useState, useEffect, useMemo } from 'react';

// Extract meaningful words from a key point string (3+ chars, skip common words)
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','it','its','that','this','they',
  'from','by','as','not','no','if','you','your','can','will','more',
  'than','when','each','use','used','via','per','how','why','what','vs',
]);

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function scorePoint(point, answer) {
  const answerLower = answer.toLowerCase();
  const keywords = extractKeywords(point);
  if (keywords.length === 0) return false;
  const matched = keywords.filter((kw) => answerLower.includes(kw));
  return matched.length / keywords.length >= 0.4; // 40% keyword hit rate = matched
}

export default function Flashcard({
  question,
  answer,
  hint,
  revealed,
  writtenAnswer = '',
  categoryColor = 'blue',
  keyPoints = [],
}) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setShowHint(false);
  }, [question]);

  // Score each key point against the written answer
  const pointScores = useMemo(() => {
    if (!revealed || keyPoints.length === 0) return [];
    return keyPoints.map((point) => ({
      point,
      matched: writtenAnswer.trim().length > 0 && scorePoint(point, writtenAnswer),
    }));
  }, [revealed, keyPoints, writtenAnswer]);

  const matchCount = pointScores.filter((p) => p.matched).length;

  if (revealed) {
    return (
      <div className="quiz-card quiz-card--revealed" style={{ '--cat-color': `var(--${categoryColor})` }}>
        <p className="quiz-card-question-sm">{question}</p>

        {/* Key points checklist */}
        {keyPoints.length > 0 && (
          <div className="quiz-key-points">
            <div className="quiz-key-points-header">
              <span className="quiz-reveal-label">Key concepts</span>
              {writtenAnswer.trim().length > 0 && (
                <span className="quiz-key-points-score">
                  {matchCount}/{pointScores.length} covered
                </span>
              )}
            </div>
            <ul className="quiz-key-points-list">
              {pointScores.map(({ point, matched }, i) => (
                <li
                  key={i}
                  className={`quiz-key-point${matched ? ' quiz-key-point--hit' : writtenAnswer.trim() ? ' quiz-key-point--miss' : ''}`}
                >
                  <span className="quiz-key-point-icon">
                    {writtenAnswer.trim() ? (matched ? '✓' : '✗') : '·'}
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Full answer */}
        <div className="quiz-full-answer">
          <span className="quiz-reveal-label">Full answer</span>
          <p className="quiz-full-answer-text">{answer}</p>
        </div>

        {/* Your written answer (if any) */}
        {writtenAnswer.trim().length > 0 && (
          <div className="quiz-your-answer">
            <span className="quiz-reveal-label">Your answer</span>
            <p className="quiz-your-answer-text">{writtenAnswer}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-card" style={{ '--cat-color': `var(--${categoryColor})` }}>
      <p className="quiz-card-question">{question}</p>
      {hint && (
        <div className="quiz-hint-wrap">
          <button
            className="quiz-hint-btn"
            type="button"
            onClick={() => setShowHint((v) => !v)}
          >
            💡 {showHint ? 'Hide hint' : 'Show hint'}
          </button>
          {showHint && <div className="quiz-hint-text">{hint}</div>}
        </div>
      )}
    </div>
  );
}
