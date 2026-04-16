// src/hooks/useQuizStorage.js
export function useQuizStorage(categoryId) {
  const progressKey = `quiz_progress_${categoryId}`;
  const bestKey = `quiz_best_${categoryId}`;
  const statsKey = 'quiz_stats';

  const loadProgress = () => {
    try {
      const raw = localStorage.getItem(progressKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const saveProgress = (state) => {
    try { localStorage.setItem(progressKey, JSON.stringify(state)); } catch {}
  };

  const clearProgress = () => {
    try { localStorage.removeItem(progressKey); } catch {}
  };

  const loadBest = () => {
    try {
      const raw = localStorage.getItem(bestKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const saveBest = (score, total) => {
    try {
      const existing = loadBest();
      const pct = Math.round((score / total) * 100);
      if (!existing || pct > existing.pct) {
        localStorage.setItem(bestKey, JSON.stringify({ score, total, pct, date: new Date().toISOString() }));
      }
    } catch {}
  };

  const loadStats = () => {
    try {
      const raw = localStorage.getItem(statsKey);
      return raw ? JSON.parse(raw) : { totalAttempts: 0, totalCorrect: 0, totalQuestions: 0 };
    } catch { return { totalAttempts: 0, totalCorrect: 0, totalQuestions: 0 }; }
  };

  const updateStats = (correct, total) => {
    try {
      const s = loadStats();
      localStorage.setItem(statsKey, JSON.stringify({
        totalAttempts: s.totalAttempts + 1,
        totalCorrect: s.totalCorrect + correct,
        totalQuestions: s.totalQuestions + total,
        lastPlayed: new Date().toISOString(),
      }));
    } catch {}
  };

  return { loadProgress, saveProgress, clearProgress, loadBest, saveBest, loadStats, updateStats };
}
