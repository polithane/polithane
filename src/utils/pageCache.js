export function readSessionCache(key, { maxAgeMs = 5 * 60_000 } = {}) {
  try {
    const raw = sessionStorage.getItem(String(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    if (!ts) return null;
    if (Number.isFinite(maxAgeMs) && maxAgeMs > 0) {
      if (Date.now() - ts > maxAgeMs) return null;
    }
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

export function writeSessionCache(key, data) {
  try {
    sessionStorage.setItem(String(key), JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore quota / privacy mode
  }
}

