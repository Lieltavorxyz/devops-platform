import { X } from 'lucide-react';

export default function SessionProgress({ index, total, onExit }) {
  const pct = total > 0 ? ((index + 1) / total) * 100 : 0;
  return (
    <div className="iv-session-bar">
      <div className="iv-session-bar-inner">
        <div className="iv-progress-track">
          <div className="iv-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="iv-progress-meta">
          <span>
            Question <strong>{index + 1}</strong> of <strong>{total}</strong>
          </span>
          <button type="button" className="iv-exit-btn" onClick={onExit}>
            <X size={14} strokeWidth={2} />
            <span>Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
