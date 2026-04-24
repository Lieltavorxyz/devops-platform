import { useState, useCallback, useEffect, useMemo } from 'react';
import { interviewQuestions } from '../data/questions';

const SESSION_KEY = 'interview.session';
const HISTORY_KEY = 'interview.history';
const HISTORY_LIMIT = 10;

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore quota / privacy errors
  }
}

function clearSessionStorage() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function pushHistoryEntry(entry) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = [entry, ...list].slice(0, HISTORY_LIMIT);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/**
 * Session shape persisted in sessionStorage:
 *   { queue: [id,...], index, ratings: {id:rating}, revealed: {id:true}, startedAt }
 */
export function useInterviewSession() {
  const [session, setSession] = useState(() => readSession());

  // Persist on every change.
  useEffect(() => {
    if (session) writeSession(session);
  }, [session]);

  const start = useCallback((queue) => {
    const fresh = {
      queue,
      index: 0,
      ratings: {},
      revealed: {},
      startedAt: Date.now(),
    };
    writeSession(fresh);
    setSession(fresh);
    return fresh;
  }, []);

  const currentQuestion = useMemo(() => {
    if (!session || session.queue.length === 0) return null;
    const id = session.queue[session.index];
    return interviewQuestions.find((q) => q.id === id) || null;
  }, [session]);

  const revealed = useMemo(() => {
    if (!session || !currentQuestion) return false;
    return !!session.revealed[currentQuestion.id];
  }, [session, currentQuestion]);

  const rating = useMemo(() => {
    if (!session || !currentQuestion) return null;
    return session.ratings[currentQuestion.id] || null;
  }, [session, currentQuestion]);

  const reveal = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const id = prev.queue[prev.index];
      if (!id) return prev;
      if (prev.revealed[id]) return prev;
      return { ...prev, revealed: { ...prev.revealed, [id]: true } };
    });
  }, []);

  const rate = useCallback((r) => {
    setSession((prev) => {
      if (!prev) return prev;
      const id = prev.queue[prev.index];
      if (!id) return prev;
      return { ...prev, ratings: { ...prev.ratings, [id]: r } };
    });
  }, []);

  const finish = useCallback(() => {
    const current = readSession();
    if (!current) return null;
    const entry = {
      id: `session_${current.startedAt}`,
      startedAt: current.startedAt,
      finishedAt: Date.now(),
      queue: current.queue,
      ratings: current.ratings,
    };
    pushHistoryEntry(entry);
    clearSessionStorage();
    setSession(null);
    return entry;
  }, []);

  const next = useCallback(() => {
    let finishedEntry = null;
    setSession((prev) => {
      if (!prev) return prev;
      if (prev.index + 1 >= prev.queue.length) {
        // Last question → finish
        finishedEntry = {
          id: `session_${prev.startedAt}`,
          startedAt: prev.startedAt,
          finishedAt: Date.now(),
          queue: prev.queue,
          ratings: prev.ratings,
        };
        pushHistoryEntry(finishedEntry);
        clearSessionStorage();
        return null;
      }
      return { ...prev, index: prev.index + 1 };
    });
    return finishedEntry;
  }, []);

  const restart = useCallback(() => {
    clearSessionStorage();
    setSession(null);
  }, []);

  return {
    queue: session?.queue ?? [],
    index: session?.index ?? 0,
    currentQuestion,
    revealed,
    rating,
    ratings: session?.ratings ?? {},
    startedAt: session?.startedAt ?? null,
    reveal,
    rate,
    next,
    finish,
    restart,
    start,
    isEmpty: !session || !session.queue || session.queue.length === 0,
  };
}
