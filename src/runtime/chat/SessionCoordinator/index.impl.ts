import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { createSessionRuntime } from '../SessionRuntime/index.impl';
import type { SessionRuntime } from '../SessionRuntime/index.type';

const POOL_CAPACITY = 8;

type PoolEntry = {
  runtime: SessionRuntime;
  operations: number;
  unsubscribe: () => void;
};

type SessionActions = Pick<SessionRuntime, 'send' | 'cancel' | 'approve' | 'loadMoreHistory'>;

export function createSessionCoordinator() {
  const pool = new Map<string, PoolEntry>();
  const subscribers = new Map<string, Set<() => void>>();
  let closed = false;

  function notify(sessionId: string): void {
    subscribers.get(sessionId)?.forEach((listener) => listener());
  }

  function getSnapshot(sessionId: string) {
    return pool.get(sessionId)?.runtime.getSnapshot();
  }

  async function dispose(sessionId: string): Promise<void> {
    const entry = pool.get(sessionId);
    if (!entry) return;
    pool.delete(sessionId);
    entry.unsubscribe();
    notify(sessionId);
    await entry.runtime.cleanup();
  }

  function evictIdleSessions(): void {
    for (const [sessionId, entry] of pool) {
      if (pool.size <= POOL_CAPACITY) return;
      if (subscribers.has(sessionId) || entry.operations > 0 || entry.runtime.isBusy()) continue;
      void dispose(sessionId);
    }
  }

  function getOrCreate(sessionId: string, newSession = false): PoolEntry {
    if (closed) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: '会话池已释放',
      });
    }
    const existing = pool.get(sessionId);
    if (existing) {
      pool.delete(sessionId);
      pool.set(sessionId, existing);
      return existing;
    }

    const runtime = createSessionRuntime(sessionId, newSession);
    const entry = {
      runtime,
      operations: 0,
      unsubscribe: runtime.subscribe(() => {
        notify(sessionId);
        evictIdleSessions();
      }),
    };
    pool.set(sessionId, entry);
    return entry;
  }

  function subscribe(
    sessionId: string,
    listener: () => void,
    onLoadError: (error: unknown) => void
  ): () => void {
    const entry = getOrCreate(sessionId);
    const listeners = subscribers.get(sessionId) ?? new Set<() => void>();
    const first = listeners.size === 0;
    listeners.add(listener);
    subscribers.set(sessionId, listeners);
    listener();

    if (first && entry.operations === 0) {
      void entry.runtime.refresh({ revalidate: true }).catch((error: unknown) => {
        if (listeners.size > 0 && pool.get(sessionId) === entry) onLoadError(error);
      });
    }
    evictIdleSessions();

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) subscribers.delete(sessionId);
      evictIdleSessions();
    };
  }

  async function withSession<T>(
    sessionId: string,
    run: (runtime: SessionActions) => Promise<T>,
    { newSession = false } = {}
  ): Promise<T> {
    const entry = getOrCreate(sessionId, newSession);
    entry.operations += 1;
    notify(sessionId);
    evictIdleSessions();
    try {
      await entry.runtime.refresh();
      if (pool.get(sessionId) !== entry) {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: '会话运行时已释放',
        });
      }
      return await run(entry.runtime);
    } finally {
      entry.operations -= 1;
      evictIdleSessions();
    }
  }

  async function cleanup(): Promise<void> {
    closed = true;
    subscribers.clear();
    await Promise.all([...pool.keys()].map(dispose));
  }

  return { getSnapshot, subscribe, withSession, dispose, cleanup };
}
