import { useState, useEffect } from 'react';

export default function Flashcard({ question, answer, hint, flipped, onFlip, categoryColor = 'blue', mode = 'flip', onReveal, revealed = false, writtenAnswer = '' }) {
  const [showHint, setShowHint] = useState(false);

  // Reset hint visibility when the question changes
  useEffect(() => {
    setShowHint(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [question]);

  const handleHintClick = (e) => {
    e.stopPropagation();
    setShowHint((prev) => !prev);
  };

  if (mode === 'write') {
    return (
      <div
        className="flashcard-scene flashcard-scene--write"
        style={{ cursor: 'default' }}
      >
        <div
          className="flashcard flashcard--write"
          style={{ '--cat-color': `var(--${categoryColor})` }}
        >
          {!revealed ? (
            // Write mode — question face only
            <div className="flashcard-face flashcard-front flashcard-front--write">
              <div className="flashcard-question">{question}</div>
              {hint && (
                <>
                  <button className="flashcard-hint-btn" onClick={handleHintClick}>
                    💡 {showHint ? 'Hide hint' : 'Show hint'}
                  </button>
                  {showHint && <div className="flashcard-hint-text">{hint}</div>}
                </>
              )}
            </div>
          ) : (
            // Revealed — split view: your answer vs correct answer
            <div className="flashcard-face flashcard-revealed">
              <div className="flashcard-back-label">Question</div>
              <div className="flashcard-back-question">{question}</div>
              <div className="write-reveal-split">
                <div className="write-reveal-col write-reveal-col--yours">
                  <div className="write-reveal-col-label">Your answer</div>
                  <div className="write-reveal-col-text">{writtenAnswer}</div>
                </div>
                <div className="write-reveal-divider" />
                <div className="write-reveal-col write-reveal-col--correct">
                  <div className="write-reveal-col-label">Correct answer</div>
                  <div className="write-reveal-col-text">{answer}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: flip mode
  return (
    <div className="flashcard-scene" onClick={onFlip}>
      <div
        className={`flashcard${flipped ? ' is-flipped' : ''}`}
        style={{ '--cat-color': `var(--${categoryColor})` }}
      >
        <div className="flashcard-face flashcard-front">
          <div className="flashcard-question">{question}</div>
          {hint && (
            <>
              <button className="flashcard-hint-btn" onClick={handleHintClick}>
                💡 {showHint ? 'Hide hint' : 'Show hint'}
              </button>
              {showHint && <div className="flashcard-hint-text">{hint}</div>}
            </>
          )}
          <div className="flashcard-tap-hint">Tap to reveal answer</div>
        </div>
        <div className="flashcard-face flashcard-back">
          <div className="flashcard-back-label">Answer</div>
          <div className="flashcard-back-question">{question}</div>
          <div className="flashcard-answer">{answer}</div>
        </div>
      </div>
    </div>
  );
}
