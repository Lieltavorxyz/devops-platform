export default function TopBar({ title, backHref = 'http://localhost:5173', backLabel = '\u2190 Portfolio' }) {
  return (
    <header className="top-bar">
      <div className="top-bar-logo">DevOps<span>Quiz</span></div>
      <a href={backHref} className="top-bar-back">{backLabel}</a>
    </header>
  );
}
