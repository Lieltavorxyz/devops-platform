export default function HighlightBox({ type = 'info', children }) {
  const cls = type === 'tip' ? 'highlight tip' : type === 'warn' ? 'highlight warn' : 'highlight';
  return <div className={cls}>{children}</div>;
}
