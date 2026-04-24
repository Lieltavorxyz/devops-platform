import { useEffect } from 'react';

function isEditable(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Keyboard shortcuts for the interview session.
 *
 *   Space         → onReveal
 *   1 / 2 / 3     → onRate('shaky' | 'ok' | 'nailed')
 *   ArrowRight /
 *   Enter         → onNext
 *   Escape        → onExit
 *
 * Disabled automatically when focus is in a text input.
 */
export function useKeyboardShortcuts({
  onReveal,
  onRate,
  onNext,
  onExit,
  enabled = true,
}) {
  useEffect(() => {
    if (!enabled) return undefined;

    const handler = (e) => {
      if (isEditable(e.target)) return;
      // Ignore modifier-based shortcuts so we don't steal e.g. ⌘R.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case ' ':
        case 'Spacebar':
          if (onReveal) {
            e.preventDefault();
            onReveal();
          }
          break;
        case '1':
          if (onRate) {
            e.preventDefault();
            onRate('shaky');
          }
          break;
        case '2':
          if (onRate) {
            e.preventDefault();
            onRate('ok');
          }
          break;
        case '3':
          if (onRate) {
            e.preventDefault();
            onRate('nailed');
          }
          break;
        case 'ArrowRight':
        case 'Enter':
          if (onNext) {
            e.preventDefault();
            onNext();
          }
          break;
        case 'Escape':
          if (onExit) {
            e.preventDefault();
            onExit();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onReveal, onRate, onNext, onExit, enabled]);
}
