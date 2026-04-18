import { useState, useEffect } from 'react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function Flashcard({
  question,
  options = [],
  correctIndex,
  answer,
  hint,
  categoryColor = 'blue',
  selectedOption = null,
  onSelect,
}) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setShowHint(false);
  }, [question]);

  const answered = selectedOption !== null;

  function optionClass(i) {
    if (!answered) return 'quiz-option';
    if (i === correctIndex) return 'quiz-option quiz-option--correct';
    if (i === selectedOption) return 'quiz-option quiz-option--wrong';
    return 'quiz-option quiz-option--dim';
  }

  return (
    <div className="quiz-card" style={{ '--cat-color': `var(--${categoryColor})` }}>
      <p className="quiz-card-question">{question}</p>

      {hint && !answered && (
        <div className="quiz-hint-wrap">
          <button
            className="quiz-hint-btn"
            type="button"
            onClick={() => setShowHint(v => !v)}
          >
            💡 {showHint ? 'Hide hint' : 'Show hint'}
          </button>
          {showHint && <div className="quiz-hint-text">{hint}</div>}
        </div>
      )}

      <div className="quiz-options">
        {options.map((opt, i) => (
          <button
            key={i}
            className={optionClass(i)}
            disabled={answered}
            onClick={() => onSelect(i)}
            type="button"
          >
            <span className="quiz-option-label">{OPTION_LABELS[i]}</span>
            <span className="quiz-option-text">{opt}</span>
          </button>
        ))}
      </div>

      {answered && (
        <div className="quiz-explanation">
          <span className="quiz-reveal-label">Explanation</span>
          <p className="quiz-explanation-text">{answer}</p>
        </div>
      )}
    </div>
  );
}
