import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { scenarios } from '../data/architectureScenarios';
import ArchitectureStudyCard from '../components/ArchitectureStudyCard';
import DiagramCanvas from '../components/DiagramCanvas';

const TABS = [
  { key: 'guide', label: 'Guide' },
  { key: 'draw', label: 'Draw' },
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
      <div style={{ paddingTop: 'calc(var(--nav-height) + 24px)', padding: 'calc(var(--nav-height) + 24px) 24px 24px', maxWidth: 'var(--content-max)', margin: '0 auto' }}>
        <p style={{ color: 'var(--text-2)' }}>Scenario not found.</p>
        <Link to="/" style={{ color: 'var(--teal)', fontSize: 13 }}>← Back to scenarios</Link>
      </div>
    );
  }

  const diffClass = scenario.difficulty;

  return (
    <div style={{ paddingTop: 'calc(var(--nav-height) + 24px)', padding: 'calc(var(--nav-height) + 24px) 24px 24px', maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      {/* Top bar */}
      <div className="practice-session-top">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Link to="/" className="practice-back-link">
            ← Back to scenarios
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="practice-session-title">{scenario.title}</h1>
            <span className={`diff-badge ${diffClass}`}>{scenario.difficulty}</span>
          </div>
        </div>
        <div className="practice-session-meta">
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            ⏱ ~{scenario.estimatedMinutes} min
          </span>
        </div>
      </div>

      {/* Mobile tab switcher */}
      <div className="practice-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`practice-tab-btn${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Three-panel layout */}
      <div className="practice-panels">
        {/* Panel 1: Study Card */}
        <div className={`practice-panel${activeTab === 'guide' ? ' active' : ''}`}>
          <div className="practice-panel-label">Study Guide</div>
          <ArchitectureStudyCard
            steps={scenario.steps}
            keyPoints={scenario.keyPoints || []}
            scenarioTitle={scenario.title}
          />
        </div>

        {/* Panel 2: Excalidraw Canvas */}
        <div className={`practice-panel${activeTab === 'draw' ? ' active' : ''}`}>
          <div className="practice-panel-label">Architecture Diagram</div>
          <DiagramCanvas scenarioId={id} />
        </div>

        {/* Panel 3: Text Flow */}
        <div className={`practice-panel${activeTab === 'notes' ? ' active' : ''}`}>
          <div className="practice-panel-label">Your Notes</div>
          <div className="flow-textarea-wrap">
            <div className="flow-textarea-header">
              <h3>Write the flow</h3>
              <p>Describe the architecture in your own words</p>
            </div>
            <textarea
              className="flow-textarea"
              value={notes}
              onChange={handleNotesChange}
              placeholder="Start with the entry point... e.g. 'User hits the ALB → ingress routes to service → pod processes request...'"
            />
            <div className={`flow-save-indicator${saved ? ' visible' : ''}`}>
              Saved ✓
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
