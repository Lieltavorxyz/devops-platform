import { useState, useEffect } from 'react';

export default function Flashcard({ question, answer, hint, revealed, writtenAnswer = '', categoryColor = 'blue' }) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setShowHint(false);
  }, [question]);

  if (revealed) {
    return (
      <div className="quiz-card quiz-card--revealed" style={{ '--cat-color': `var(--${categoryColor})` }}>
        <p className="quiz-card-question-sm">{question}</p>
        <div className="quiz-reveal-split">
          <div className="quiz-reveal-col quiz-reveal-col--yours">
            <span className="quiz-reveal-label">Your answer</span>
            <p className="quiz-reveal-text">
              {writtenAnswer.trim()
                ? writtenAnswer
                : <em style={{ color: 'var(--text-3)' }}>Chose to flip</em>}
            </p>
          </div>
          <div className="quiz-reveal-divider" />
          <div className="quiz-reveal-col quiz-reveal-col--correct">
            <span className="quiz-reveal-label">Answer</span>
            <p className="quiz-reveal-text">{answer}</p>
          </div>
        </div>
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
