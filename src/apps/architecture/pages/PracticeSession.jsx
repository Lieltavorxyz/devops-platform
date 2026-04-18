import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { scenarios } from '../data/architectureScenarios';
import ArchitectureStudyCard from '../components/ArchitectureStudyCard';
import DiagramCanvas from '../components/DiagramCanvas';
import ExcalidrawViewer from '../components/ExcalidrawViewer';

const DIFF_COLORS = {
  easy:   'var(--green)',
  normal: 'var(--blue)',
  hard:   'var(--orange)',
  expert: 'var(--purple)',
};

const DIFF_LABELS = { easy: 'Easy', normal: 'Normal', hard: 'Hard', expert: 'Expert' };

const TABS = [
  { key: 'guide', label: 'Guide' },
  { key: 'draw',  label: 'Draw'  },
  { key: 'notes', label: 'Notes' },
];

export default function PracticeSession() {
  const { id } = useParams();
  const scenario = scenarios.find(s => s.id === id);

  const storageKey = `arch_notes_${id}`;
  const [notes, setNotes] = useState(() => {
    try { return localStorage.getItem(storageKey) || ''; } catch { return ''; }
  });
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('guide');
  const [revealed, setRevealed] = useState(false);

  function handleNotesChange(e) {
    const val = e.target.value;
    setNotes(val);
    try { localStorage.setItem(storageKey, val); } catch {}
    setSaved(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaved(false), 2000);
  }

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  if (!scenario) {
    return (
      <div className="page-wrap">
        <p style={{ color: 'var(--text-2)' }}>Scenario not found.</p>
        <Link to="/architecture" style={{ color: 'var(--teal)', fontSize: 13 }}>
          ← Back to scenarios
        </Link>
      </div>
    );
  }

  const diffColor = DIFF_COLORS[scenario.difficulty] || 'var(--teal)';

  return (
    <div className="arch-session-wrap">
      {/* Top bar */}
      <div className="arch-session-top">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Link to="/architecture" className="arch-back-link">← Back to scenarios</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="arch-session-title">{scenario.title}</h1>
            <span
              className="arch-diff-badge"
              style={{ color: diffColor, background: `${diffColor}20`, fontSize: 11 }}
            >
              {DIFF_LABELS[scenario.difficulty] || scenario.difficulty}
            </span>
          </div>
        </div>
        <span className="arch-session-meta">⏱ ~{scenario.estimatedMinutes} min</span>
      </div>

      {/* Mobile tabs */}
      <div className="arch-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`arch-tab-btn${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Three-panel layout */}
      <div className="arch-panels">
        {/* Guide */}
        <div className={`arch-panel${activeTab === 'guide' ? ' active' : ''}`}>
          <div className="arch-panel-label">Study Guide</div>
          <ArchitectureStudyCard
            steps={scenario.steps}
            keyPoints={scenario.keyPoints || []}
            scenarioTitle={scenario.title}
          />
        </div>

        {/* Draw + optional reveal */}
        <div className={`arch-panel arch-panel--draw${activeTab === 'draw' ? ' active' : ''}`}>
          <div className="arch-draw-header">
            <div className="arch-panel-label" style={{ margin: 0 }}>Architecture Diagram</div>
            <button
              className={`arch-reveal-btn${revealed ? ' arch-reveal-btn--active' : ''}`}
              onClick={() => setRevealed(v => !v)}
            >
              {revealed ? '✕ Hide Reference' : '◎ Show Reference Answer'}
            </button>
          </div>

          <div className={`arch-draw-split${revealed ? ' arch-draw-split--revealed' : ''}`}>
            <div className="arch-canvas-area">
              <DiagramCanvas scenarioId={id} />
            </div>
            {revealed && (
              <div className="arch-viewer-area">
                <div className="arch-viewer-label">Reference Answer</div>
                <ExcalidrawViewer scenario={scenario} />
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className={`arch-panel${activeTab === 'notes' ? ' active' : ''}`}>
          <div className="arch-panel-label">Your Notes</div>
          <div className="arch-notes-wrap">
            <div className="arch-notes-header">
              <h3>Write the flow</h3>
              <p>Describe the architecture in your own words</p>
            </div>
            <textarea
              className="arch-notes-textarea"
              value={notes}
              onChange={handleNotesChange}
              placeholder="Start with the entry point… e.g. 'User hits the ALB → ingress routes to service → pod processes request…'"
            />
            <div className={`arch-notes-saved${saved ? ' visible' : ''}`}>Saved ✓</div>
          </div>
        </div>
      </div>
    </div>
  );
}
