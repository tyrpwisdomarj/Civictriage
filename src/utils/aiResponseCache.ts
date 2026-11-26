const MEMORY_CACHE = new Map<string, { value: unknown; expiresAt: number }>();
const STORAGE_PREFIX = 'civictriage_ai_cache_v1:';
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export function readAiCache<T>(key: string): T | null {
  const now = Date.now();
  const mem = MEMORY_CACHE.get(key);
  if (mem && mem.expiresAt > now) {
    return mem.value as T;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value: T; expiresAt: number };
    if (parsed && parsed.expiresAt > now) {
      MEMORY_CACHE.set(key, parsed);
      return parsed.value;
    }
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore corrupted cache entries
  }
  return null;
}

export function writeAiCache<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  const entry = { value, expiresAt: Date.now() + ttlMs };
  MEMORY_CACHE.set(key, entry);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // ignore storage quota exceeded
  }
}
