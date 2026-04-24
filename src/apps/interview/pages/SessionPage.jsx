import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import SessionProgress from '../components/SessionProgress';
import QuestionCard from '../components/QuestionCard';
import KeyboardHintsFooter from '../components/KeyboardHintsFooter';

export default function SessionPage() {
  const navigate = useNavigate();
  const {
    queue,
    index,
    currentQuestion,
    revealed,
    rating,
    reveal,
    rate,
    next,
    restart,
    isEmpty,
  } = useInterviewSession();

  // Redirect if nothing to do.
  useEffect(() => {
    if (isEmpty) {
      navigate('/interview', { replace: true });
    }
  }, [isEmpty, navigate]);

  const handleExit = useCallback(() => {
    restart();
    navigate('/interview', { replace: true });
  }, [restart, navigate]);

  const handleNext = useCallback(() => {
    if (!revealed || !rating) return;
    const isLast = index + 1 >= queue.length;
    next();
    if (isLast) {
      navigate('/interview/summary', { replace: true });
    }
  }, [revealed, rating, index, queue.length, next, navigate]);

  const handleReveal = useCallback(() => {
    if (!revealed) reveal();
  }, [revealed, reveal]);

  const handleRate = useCallback(
    (r) => {
      if (!revealed) return;
      rate(r);
    },
    [revealed, rate],
  );

  useKeyboardShortcuts({
    onReveal: handleReveal,
    onRate: handleRate,
    onNext: handleNext,
    onExit: handleExit,
    enabled: !isEmpty && !!currentQuestion,
  });

  if (isEmpty || !currentQuestion) return null;

  const isLast = index + 1 >= queue.length;

  return (
    <>
      <SessionProgress index={index} total={queue.length} onExit={handleExit} />
      <div className="iv-page iv-page--narrow">
        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          revealed={revealed}
          rating={rating}
          onReveal={handleReveal}
          onRate={handleRate}
          onNext={handleNext}
          isLast={isLast}
        />
      </div>
      <KeyboardHintsFooter />
    </>
  );
}
