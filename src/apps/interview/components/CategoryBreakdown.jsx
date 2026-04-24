import { Layers } from 'lucide-react';
import { interviewCategories } from '../data/questions';

export default function CategoryBreakdown({ byCategory }) {
  // byCategory: { [categoryId]: { nailed, ok, shaky, total } }
  const rows = Object.entries(byCategory)
    .map(([catId, c]) => {
      const cat = interviewCategories.find((x) => x.id === catId);
      const total = (c.nailed || 0) + (c.ok || 0) + (c.shaky || 0);
      const shakyFrac = total > 0 ? (c.shaky || 0) / total : 0;
      return { catId, label: cat?.label || catId, ...c, total, shakyFrac };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.shakyFrac - a.shakyFrac);

  return (
    <div className="iv-panel">
      <div className="iv-panel-head">
        <Layers size={15} strokeWidth={2} />
        <span>By category</span>
      </div>

      {rows.length === 0 ? (
        <div className="iv-empty" style={{ padding: '12px 0' }}>No categories yet.</div>
      ) : (
        <div className="iv-catbd-list">
          {rows.map((row) => {
            const pct = (n) => (row.total > 0 ? `${(n / row.total) * 100}%` : '0%');
            return (
              <div key={row.catId} className="iv-catbd-row">
                <div className="iv-catbd-top">
                  <strong>{row.label}</strong>
                  <span className="iv-catbd-counts">
                    {row.nailed || 0} / {row.ok || 0} / {row.shaky || 0}
                  </span>
                </div>
                <div className="iv-catbd-bar">
                  {row.nailed > 0 && (
                    <div className="iv-catbd-seg iv-catbd-seg--nailed" style={{ width: pct(row.nailed) }} />
                  )}
                  {row.ok > 0 && (
                    <div className="iv-catbd-seg iv-catbd-seg--ok" style={{ width: pct(row.ok) }} />
                  )}
                  {row.shaky > 0 && (
                    <div className="iv-catbd-seg iv-catbd-seg--shaky" style={{ width: pct(row.shaky) }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
