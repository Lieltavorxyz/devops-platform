import { useCallback, useEffect, useState } from 'react';

const HISTORY_KEY = 'interview.history';
const HISTORY_LIMIT = 10;

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function useInterviewHistory() {
  const [history, setHistory] = useState(() => readHistory());

  // Re-read on mount in case another tab or hook updated it.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === HISTORY_KEY) setHistory(readHistory());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const pushSession = useCallback((entry) => {
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, HISTORY_LIMIT);
      writeHistory(next);
      return next;
    });
  }, []);

  const refresh = useCallback(() => {
    setHistory(readHistory());
  }, []);

  const lastSession = history[0] || null;

  return { lastSession, history, pushSession, refresh };
}
