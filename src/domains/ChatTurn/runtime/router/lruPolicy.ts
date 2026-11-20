import { MAX_CACHED_RUNTIMES } from './routerTypes';

export interface LruEntry {
  sessionId: string;
  lastFocusedAt: number;
}

export function pickLruVictim(
  entries: readonly LruEntry[],
  activeSessionId: string | null,
  maxCached: number = MAX_CACHED_RUNTIMES
): string | null {
  if (entries.length <= maxCached) return null;

  const candidates = entries
    .filter((entry) => entry.sessionId !== activeSessionId)
    .sort((a, b) => a.lastFocusedAt - b.lastFocusedAt);

  return candidates[0]?.sessionId ?? null;
}
