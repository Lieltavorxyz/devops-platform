export default function KeyboardHintsFooter() {
  return (
    <div className="iv-kbd-footer" aria-hidden="true">
      <span className="iv-kbd-group">
        <kbd>Space</kbd>
        <span>reveal</span>
      </span>
      <span className="iv-kbd-sep">·</span>
      <span className="iv-kbd-group">
        <kbd>1</kbd>
        <kbd>2</kbd>
        <kbd>3</kbd>
        <span>rate</span>
      </span>
      <span className="iv-kbd-sep">·</span>
      <span className="iv-kbd-group">
        <kbd>→</kbd>
        <span>next</span>
      </span>
      <span className="iv-kbd-sep">·</span>
      <span className="iv-kbd-group">
        <kbd>Esc</kbd>
        <span>exit</span>
      </span>
    </div>
  );
}
