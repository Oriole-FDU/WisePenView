import { getChatSessionService } from '@/domains';
import type { CreateSessionRequest, IChatSessionService } from '@/domains/ChatSession';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { createSessionRuntime } from '../SessionRuntime/index.impl';
import type { SessionRuntime } from '../SessionRuntime/index.type';
import type { SessionCoordinator } from './index.type';

const POOL_CAPACITY = 8;

type PoolEntry = {
  runtime: SessionRuntime;
  frequency: number;
  lastUsedAt: number;
};

export function createSessionCoordinator(
  getForegroundSessionId: () => string | undefined
): SessionCoordinator {
  const chatSessionService: IChatSessionService = getChatSessionService();
  const pool = new Map<string, PoolEntry>();
  const pending = new Map<string, { token: symbol; promise: Promise<SessionRuntime> }>();
  const reservations = new Set<symbol>();
  let reservationQueue = Promise.resolve();
  let cleaned = false;

  function assertAlive(): void {
    if (!cleaned) return;
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'SessionCoordinator 已 cleanup',
    });
  }

  function touch(entry: PoolEntry): void {
    entry.frequency += 1;
    entry.lastUsedAt = Date.now();
  }

  function pickLfuVictim(): string | null {
    const foregroundSessionId = getForegroundSessionId();
    let victimId: string | null = null;
    let victim: PoolEntry | null = null;
    for (const [sessionId, entry] of pool) {
      if (sessionId === foregroundSessionId) continue;
      if (
        !victim ||
        entry.frequency < victim.frequency ||
        (entry.frequency === victim.frequency && entry.lastUsedAt < victim.lastUsedAt)
      ) {
        victimId = sessionId;
        victim = entry;
      }
    }
    return victimId;
  }

  async function dispose(sessionId: string): Promise<void> {
    const entry = pool.get(sessionId);
    const initialization = pending.get(sessionId);
    pool.delete(sessionId);
    pending.delete(sessionId);
    await entry?.runtime.cleanup();
    await initialization?.promise.catch(() => undefined);
  }

  function reserveCapacity(token: symbol): Promise<void> {
    const reservation = reservationQueue.then(async () => {
      while (pool.size + reservations.size >= POOL_CAPACITY) {
        const victimId = pickLfuVictim();
        if (!victimId) break;
        await dispose(victimId);
      }
      reservations.add(token);
    });
    reservationQueue = reservation.catch(() => undefined);
    return reservation;
  }

  function initialize(sessionId: string, kind: 'new' | 'existing'): Promise<SessionRuntime> {
    const existing = pool.get(sessionId);
    if (existing) return Promise.resolve(existing.runtime);

    const existingInitialization = pending.get(sessionId);
    if (existingInitialization) return existingInitialization.promise;

    const token = Symbol(sessionId);
    const initialization = reserveCapacity(token)
      .then(async () => {
        assertAlive();
        if (pending.get(sessionId)?.token !== token) {
          throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
            reason: 'SessionRuntime 已被 dispose',
          });
        }
        const runtime = createSessionRuntime(sessionId);
        try {
          if (kind === 'existing') await runtime.refresh();
          assertAlive();
          if (pending.get(sessionId)?.token !== token) {
            throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
              reason: 'SessionRuntime 已被 dispose',
            });
          }
          pool.set(sessionId, {
            runtime,
            frequency: 1,
            lastUsedAt: Date.now(),
          });
          return runtime;
        } catch (error) {
          await runtime.cleanup();
          throw error;
        }
      })
      .finally(() => {
        reservations.delete(token);
        if (pending.get(sessionId)?.token === token) pending.delete(sessionId);
      });
    pending.set(sessionId, { token, promise: initialization });
    return initialization;
  }

  async function createSession(params?: CreateSessionRequest): Promise<SessionRuntime> {
    assertAlive();
    const session = await chatSessionService.createSession(params);
    assertAlive();
    return initialize(session.id, 'new');
  }

  async function acquire(sessionId: string): Promise<SessionRuntime> {
    assertAlive();
    if (sessionId === '') {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: 'acquire 缺少 sessionId',
      });
    }

    const existing = pool.get(sessionId);
    if (existing) {
      touch(existing);
      await existing.runtime.refresh();
      assertAlive();
      if (pool.get(sessionId)?.runtime !== existing.runtime) {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: 'SessionRuntime 已被 dispose',
        });
      }
      return existing.runtime;
    }

    const runtime = await initialize(sessionId, 'existing');
    assertAlive();
    const entry = pool.get(sessionId);
    if (entry?.runtime !== runtime) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: 'SessionRuntime 已被 dispose',
      });
    }
    touch(entry);
    return runtime;
  }

  async function cleanup(): Promise<void> {
    if (cleaned) return;
    cleaned = true;
    const sessionIds = new Set([...pool.keys(), ...pending.keys()]);
    await Promise.all([...sessionIds].map(dispose));
  }

  return { createSession, acquire, dispose, cleanup };
}
