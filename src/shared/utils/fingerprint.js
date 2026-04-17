/**
 * Generates a stable device fingerprint for anti-gaming.
 * Not cryptographic — just enough to prevent casual multi-submit.
 * Stored in localStorage so it persists across sessions.
 */
export function getDeviceFingerprint() {
  const stored = localStorage.getItem('_dfp');
  if (stored) return stored;

  const parts = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    navigator.hardwareConcurrency || 0,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    new Date().getTimezoneOffset(),
  ];

  // djb2 hash
  const str = parts.join('|');
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  const fp = hash.toString(36);

  try {
    localStorage.setItem('_dfp', fp);
  } catch (_) {}
  return fp;
}
