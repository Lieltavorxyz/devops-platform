import { Eye, ArrowRight, Lightbulb } from 'lucide-react';
import { interviewCategories } from '../data/questions';
import ThinkTimer from './ThinkTimer';
import KeyPointsBox from './KeyPointsBox';
import FollowUpCallout from './FollowUpCallout';
import RatingBar from './RatingBar';

const ACCENTS = {
  blue:   { accent: 'var(--blue)',   dim: 'var(--blue-dim)'   },
  teal:   { accent: 'var(--teal)',   dim: 'var(--teal-dim)'   },
  purple: { accent: 'var(--purple)', dim: 'var(--purple-dim)' },
  green:  { accent: 'var(--green)',  dim: 'var(--green-dim)'  },
  orange: { accent: 'var(--orange)', dim: 'var(--orange-dim)' },
  yellow: { accent: 'var(--yellow)', dim: 'var(--yellow-dim)' },
  red:    { accent: 'var(--red)',    dim: 'var(--red-dim)'    },
};

export default function QuestionCard({
  question,
  revealed,
  rating,
  userAnswer,
  onAnswer,
  onReveal,
  onRate,
  onNext,
  isLast,
}) {
  const category = interviewCategories.find((c) => c.id === question.category);
  const colors = ACCENTS[category?.accent] || ACCENTS.blue;

  return (
    <div
      className="iv-q-card"
      style={{ '--cat-accent': colors.accent, '--cat-dim': colors.dim }}
    >
      <div className="iv-q-head">
        {category && (
          <span className="iv-q-cat-chip">{category.label}</span>
        )}
        {question.level && (
          <span className="iv-q-level-chip">{question.level}</span>
        )}
      </div>

      <div className="iv-q-text">{question.question}</div>

      {!revealed && (
        <>
          <div className="iv-think-hint">
            <Lightbulb size={15} strokeWidth={2} />
            <span>Write your answer below, then reveal to compare against the model answer.</span>
          </div>
          <textarea
            className="iv-answer-input"
            placeholder="Type your answer here before revealing..."
            value={userAnswer}
            onChange={e => onAnswer(e.target.value)}
            rows={5}
          />
          <div className="iv-reveal-row">
            <ThinkTimer running={!revealed} resetKey={question.id} />
            <button type="button" className="iv-reveal-btn" onClick={onReveal}>
              <Eye size={16} strokeWidth={2} />
              <span>Reveal Answer</span>
              <kbd>Space</kbd>
            </button>
          </div>
        </>
      )}

      {revealed && (
        <>
          <div className="iv-answer-block">
            <span className="iv-answer-label">Model Answer</span>
            <div className="iv-answer-text">{question.answer}</div>
          </div>

          {userAnswer && userAnswer.trim().length > 0 && (
            <div className="iv-your-answer">
              <span className="iv-answer-label">Your answer</span>
              <div className="iv-your-answer-text">{userAnswer}</div>
            </div>
          )}

          <KeyPointsBox points={question.keyPoints} userAnswer={userAnswer} />

          <FollowUpCallout text={question.followUp} />

          <RatingBar value={rating} onRate={onRate} />

          {rating && (
            <div className="iv-next-row">
              <button type="button" className="iv-next-btn" onClick={onNext}>
                <span>{isLast ? 'Finish session' : 'Next question'}</span>
                <ArrowRight size={16} strokeWidth={2} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
