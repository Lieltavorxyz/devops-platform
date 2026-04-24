import { Boxes, Network, Globe, TrendingUp, AlertTriangle, GitBranch, ShieldCheck } from 'lucide-react';

const ICONS = {
  kubernetes: Boxes,
  networking: Network,
  'multi-region': Globe,
  autoscaling: TrendingUp,
  incident: AlertTriangle,
  gitops: GitBranch,
  security: ShieldCheck,
};

const ACCENTS = {
  blue:   { accent: 'var(--blue)',   dim: 'var(--blue-dim)'   },
  teal:   { accent: 'var(--teal)',   dim: 'var(--teal-dim)'   },
  purple: { accent: 'var(--purple)', dim: 'var(--purple-dim)' },
  green:  { accent: 'var(--green)',  dim: 'var(--green-dim)'  },
  orange: { accent: 'var(--orange)', dim: 'var(--orange-dim)' },
  yellow: { accent: 'var(--yellow)', dim: 'var(--yellow-dim)' },
  red:    { accent: 'var(--red)',    dim: 'var(--red-dim)'    },
};

export default function CategoryCard({ category, counts, onStart }) {
  const Icon = ICONS[category.id] || Boxes;
  const colors = ACCENTS[category.accent] || ACCENTS.blue;
  const total = counts.total;
  const disabled = total === 0;

  return (
    <button
      type="button"
      className="iv-cat-card"
      style={{ '--cat-accent': colors.accent, '--cat-dim': colors.dim }}
      onClick={() => !disabled && onStart(category.id)}
      disabled={disabled}
    >
      <div className="iv-cat-head">
        <span className="iv-cat-icon-box">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <span className="iv-cat-name">{category.label}</span>
      </div>
      <p className="iv-cat-desc">{category.description}</p>
      <div className="iv-cat-foot">
        <span className="iv-cat-count">
          {total} {total === 1 ? 'question' : 'questions'}
        </span>
        <span className="iv-cat-chips">
          {counts.mid > 0 && (
            <span className="iv-cat-chip iv-cat-chip--mid">{counts.mid} mid</span>
          )}
          {counts.senior > 0 && (
            <span className="iv-cat-chip iv-cat-chip--senior">{counts.senior} senior</span>
          )}
        </span>
      </div>
    </button>
  );
}
