import { getDeviceFingerprint } from '../utils/fingerprint';

const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';
const RATE_LIMIT_MS = 60_000; // 1 minute between submissions per category+difficulty

// ─── localStorage helpers ────────────────────────────────────────────────────

function localKey(category, difficulty) {
  return `lb_${category}_${difficulty}`;
}

function saveLocalScore(entry) {
  try {
    const key = localKey(entry.category, entry.difficulty);
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push({ ...entry, ts: Date.now() });
    // keep top 50 locally
    existing.sort((a, b) => b.pct - a.pct);
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
  } catch (_) {}
}

function getLocalLeaderboard(category, difficulty, limit = 10) {
  try {
    const key = localKey(category, difficulty);
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    return items.slice(0, limit);
  } catch (_) {
    return [];
  }
}

function getLocalPersonalBest(category, difficulty) {
  try {
    const fp = getDeviceFingerprint();
    const key = localKey(category, difficulty);
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    const mine = items.filter((e) => e.device_fp === fp);
    if (!mine.length) return null;
    return mine.reduce((best, e) => (e.pct > best.pct ? e : best), mine[0]);
  } catch (_) {
    return null;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useScores() {
  /**
   * Submit a completed quiz score.
   * Saves to localStorage immediately, then tries PocketBase.
   */
  const submitScore = async ({ category, difficulty, score, total, nickname }) => {
    const pct = Math.round((score / total) * 100);
    const fp = getDeviceFingerprint();

    // Client-side rate limit (anti-gaming)
    const rateLimitKey = `rl_${category}_${difficulty}`;
    const lastTs = parseInt(localStorage.getItem(rateLimitKey) || '0', 10);
    if (Date.now() - lastTs < RATE_LIMIT_MS) {
      return { ok: false, reason: 'rate_limited' };
    }

    const entry = {
      category,
      difficulty,
      score,
      total,
      pct,
      nickname: nickname?.trim().slice(0, 32) || 'Anonymous',
      device_fp: fp,
    };

    // Always persist locally first
    saveLocalScore(entry);

    // Try remote
    try {
      const res = await fetch(`${PB_URL}/api/collections/scores/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        localStorage.setItem(rateLimitKey, Date.now().toString());
        return { ok: true, remote: true };
      }
    } catch (_) {
      // PocketBase offline — local save already done
    }

    localStorage.setItem(rateLimitKey, Date.now().toString());
    return { ok: true, remote: false };
  };

  /**
   * Fetch top scores. Falls back to localStorage when PocketBase unavailable.
   */
  const getLeaderboard = async (category, difficulty, limit = 10) => {
    try {
      const filter = encodeURIComponent(`category="${category}"&&difficulty="${difficulty}"`);
      const url = `${PB_URL}/api/collections/scores/records?filter=${filter}&sort=-pct,-score&perPage=${limit}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      return { items: data.items || [], source: 'remote' };
    } catch (_) {
      return { items: getLocalLeaderboard(category, difficulty, limit), source: 'local' };
    }
  };

  /**
   * Return the current device's personal best for a category+difficulty.
   */
  const getPersonalBest = (category, difficulty) => {
    return getLocalPersonalBest(category, difficulty);
  };

  return { submitScore, getLeaderboard, getPersonalBest };
}
