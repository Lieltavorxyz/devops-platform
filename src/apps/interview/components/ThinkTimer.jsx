import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Timer } from 'lucide-react';

function format(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

/**
 * Create a tiny per-instance store that tracks elapsed milliseconds.
 * It is an "external system" as far as React is concerned, so reading
 * its snapshot during render is a pure operation.
 */
function createTimerStore() {
  let startedAt = Date.now();
  let stoppedAt = null;
  let listeners = new Set();
  let intervalId = null;

  const notify = () => {
    listeners.forEach((l) => l());
  };

  const ensureInterval = () => {
    if (intervalId !== null) return;
    intervalId = setInterval(notify, 1000);
  };

  const clearIntervalIfIdle = () => {
    if (intervalId !== null && listeners.size === 0) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  return {
    reset() {
      startedAt = Date.now();
      stoppedAt = null;
      notify();
    },
    stop() {
      if (stoppedAt === null) {
        stoppedAt = Date.now();
        notify();
      }
    },
    run() {
      // Resume from the existing origin; clears a frozen stop marker.
      stoppedAt = null;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      ensureInterval();
      return () => {
        listeners.delete(listener);
        clearIntervalIfIdle();
      };
    },
    getSnapshot() {
      const end = stoppedAt ?? Date.now();
      return Math.max(0, end - startedAt);
    },
    getServerSnapshot() {
      return 0;
    },
  };
}

export default function ThinkTimer({ running, resetKey }) {
  const store = useMemo(() => createTimerStore(), []);

  const elapsed = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  useEffect(() => {
    store.reset();
  }, [resetKey, store]);

  useEffect(() => {
    if (running) store.run();
    else store.stop();
  }, [running, store]);

  return (
    <span className={`iv-timer${running ? '' : ' iv-timer--done'}`}>
      <Timer size={12} strokeWidth={2} />
      <span className="iv-timer-value">{format(elapsed)}</span>
    </span>
  );
}
