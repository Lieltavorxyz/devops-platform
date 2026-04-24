import { AlertTriangle, CircleDot, CheckCircle2 } from 'lucide-react';

const OPTIONS = [
  {
    id: 'shaky',
    label: 'Shaky',
    Icon: AlertTriangle,
    key: '1',
    color: 'var(--rating-shaky)',
    bg: 'var(--rating-shaky-bg)',
  },
  {
    id: 'ok',
    label: 'Got it',
    Icon: CircleDot,
    key: '2',
    color: 'var(--rating-ok)',
    bg: 'var(--rating-ok-bg)',
  },
  {
    id: 'nailed',
    label: 'Nailed it',
    Icon: CheckCircle2,
    key: '3',
    color: 'var(--rating-nailed)',
    bg: 'var(--rating-nailed-bg)',
  },
];

export default function RatingBar({ value, onRate }) {
  return (
    <div className="iv-rating" role="group" aria-label="Rate your answer">
      {OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            type="button"
            key={opt.id}
            className={`iv-rating-btn${active ? ' iv-rating-btn--active' : ''}`}
            style={{ '--rate-color': opt.color, '--rate-bg': opt.bg }}
            onClick={() => onRate(opt.id)}
            aria-pressed={active}
          >
            <opt.Icon size={16} strokeWidth={2} />
            <span>{opt.label}</span>
            <kbd>{opt.key}</kbd>
          </button>
        );
      })}
    </div>
  );
}
