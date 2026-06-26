/**
 * Module-level in-memory cache (persists across component mounts in the same
 * browser session).  Implements stale-while-revalidate: callers show cached
 * data immediately, then silently re-fetch and call set() to update.
 */

const _store = new Map<string, unknown>();

export const appCache = {
  get<T>(key: string): T | null {
    return (_store.has(key) ? _store.get(key) : null) as T | null;
  },
  set<T>(key: string, data: T): void {
    _store.set(key, data);
  },
  del(key: string): void {
    _store.delete(key);
  },
  /** Invalidate all keys whose name contains `prefix`. */
  invalidate(prefix: string): void {
    for (const k of _store.keys()) {
      if (k.includes(prefix)) _store.delete(k);
    }
  },
};
