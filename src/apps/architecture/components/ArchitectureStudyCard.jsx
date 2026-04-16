import { useState } from 'react';

export default function ArchitectureStudyCard({ steps = [], keyPoints = [], scenarioTitle }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showKeyPoints, setShowKeyPoints] = useState(false);

  const totalSteps = steps.length;
  const currentStep = steps[currentIndex];

  function handleNext() {
    if (currentIndex < totalSteps - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowKeyPoints(true);
    }
  }

  function handlePrev() {
    if (showKeyPoints) {
      setShowKeyPoints(false);
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setShowKeyPoints(false);
  }

  if (showKeyPoints) {
    return (
      <div className="study-card">
        <div className="study-complete-heading">
          <span>✓</span>
          <span>Scenario Complete</span>
        </div>

        <div className="study-keypoints">
          {keyPoints.map((point, i) => (
            <div key={i} className="study-keypoint">{point}</div>
          ))}
        </div>

        <div className="study-card-nav">
          <button className="study-nav-btn" onClick={handleRestart}>
            ← Restart
          </button>
          <span />
        </div>
      </div>
    );
  }

  return (
    <div className="study-card">
      <div className="study-card-progress">
        <div className="study-progress-dots">
          {steps.map((_, i) => {
            let dotClass = 'study-dot';
            if (i === currentIndex) dotClass += ' active';
            else if (i < currentIndex) dotClass += ' done';
            return <span key={i} className={dotClass} />;
          })}
        </div>
        <span className="study-step-counter">
          Step {currentIndex + 1} of {totalSteps}
        </span>
      </div>

      <div className="study-card-title">{currentStep.title}</div>

      <div className="study-card-desc">{currentStep.description}</div>

      {currentStep.decisions && currentStep.decisions.length > 0 && (
        <div>
          <div className="study-section-label">Decisions &amp; Tradeoffs</div>
          <ul className="study-decisions">
            {currentStep.decisions.map((decision, i) => (
              <li key={i}>⚖️ {decision}</li>
            ))}
          </ul>
        </div>
      )}

      {currentStep.components && currentStep.components.length > 0 && (
        <div>
          <div className="study-section-label">Components</div>
          <div className="study-components">
            {currentStep.components.map((component, i) => (
              <span key={i} className="study-component-tag">{component}</span>
            ))}
          </div>
        </div>
      )}

      <div className="study-card-nav">
        <button
          className="study-nav-btn"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          ← Prev
        </button>
        <button
          className="study-nav-btn primary"
          onClick={handleNext}
        >
          {currentIndex < totalSteps - 1 ? 'Next →' : 'Finish →'}
        </button>
      </div>
    </div>
  );
}
