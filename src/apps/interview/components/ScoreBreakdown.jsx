import { BarChart3 } from 'lucide-react';

export default function ScoreBreakdown({ counts, total }) {
  const nailed = counts.nailed || 0;
  const ok = counts.ok || 0;
  const shaky = counts.shaky || 0;
  const rated = nailed + ok + shaky;
  const safeTotal = total || rated || 1;

  const pct = (n) => `${(n / safeTotal) * 100}%`;

  return (
    <div className="iv-panel">
      <div className="iv-panel-head">
        <BarChart3 size={15} strokeWidth={2} />
        <span>Score</span>
      </div>

      <div>
        <div className="iv-score-total">{nailed + ok}<span style={{ fontSize: 18, color: 'var(--text-3)', fontWeight: 600 }}>/{total}</span></div>
        <div className="iv-score-total-label">
          {total > 0 ? `${Math.round(((nailed + ok) / total) * 100)}% comfortable` : 'no ratings yet'}
        </div>
      </div>

      <div className="iv-stacked-bar" aria-label="Rating distribution">
        {nailed > 0 && (
          <div className="iv-stacked-seg iv-stacked-seg--nailed" style={{ width: pct(nailed) }} />
        )}
        {ok > 0 && (
          <div className="iv-stacked-seg iv-stacked-seg--ok" style={{ width: pct(ok) }} />
        )}
        {shaky > 0 && (
          <div className="iv-stacked-seg iv-stacked-seg--shaky" style={{ width: pct(shaky) }} />
        )}
      </div>

      <div className="iv-legend">
        <span className="iv-legend-item">
          <span className="iv-legend-dot iv-legend-dot--nailed" />
          Nailed it
          <span className="iv-legend-count">· {nailed}</span>
        </span>
        <span className="iv-legend-item">
          <span className="iv-legend-dot iv-legend-dot--ok" />
          Got it
          <span className="iv-legend-count">· {ok}</span>
        </span>
        <span className="iv-legend-item">
          <span className="iv-legend-dot iv-legend-dot--shaky" />
          Shaky
          <span className="iv-legend-count">· {shaky}</span>
        </span>
      </div>
    </div>
  );
}
