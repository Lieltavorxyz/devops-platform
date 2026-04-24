import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen } from 'lucide-react';

export default function ShakyList({ questions }) {
  if (!questions || questions.length === 0) return null;
  return (
    <div className="iv-shaky-panel">
      <div className="iv-shaky-head">
        <AlertTriangle size={15} strokeWidth={2} />
        <span>Review these — you rated them shaky</span>
      </div>
      {questions.map((q) => (
        <div key={q.id} className="iv-shaky-item">
          <div className="iv-shaky-q">{q.question}</div>
          {q.kbLinks && q.kbLinks.length > 0 && (
            <div className="iv-shaky-links">
              {q.kbLinks.map((link) => (
                <Link key={link.path} to={link.path} className="iv-shaky-link">
                  <BookOpen size={12} strokeWidth={2} />
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
