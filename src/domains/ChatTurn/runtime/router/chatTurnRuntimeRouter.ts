/**
 * 标签页内 Runtime 路由：多实例缓存、唯一 focus、超限 dispose。
 */
import { registerStore } from '@/store/lifecycle';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { pickLruVictim } from './lruPolicy';
import {
  type ChatTurnRuntimeRouter,
  MAX_CACHED_RUNTIMES,
  type RouterRuntimePort,
} from './routerTypes';

interface CacheEntry {
  runtime: RouterRuntimePort;
  lastFocusedAt: number;
}

function createChatTurnRuntimeRouter(
  maxCached: number = MAX_CACHED_RUNTIMES
): ChatTurnRuntimeRouter {
  const entries = new Map<string, CacheEntry>();
  const listeners = new Set<() => void>();
  let activeSessionId: string | null = null;
  let focusEpoch = 0;

  const emit = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const disposeEntry = (sessionId: string) => {
    const entry = entries.get(sessionId);
    if (!entry) return;
    entries.delete(sessionId);
    if (activeSessionId === sessionId) {
      activeSessionId = null;
    }
    entry.runtime.dispose();
  };

  const trimToLimit = () => {
    while (entries.size > maxCached) {
      const victimId = pickLruVictim(
        [...entries.entries()].map(([sessionId, entry]) => ({
          sessionId,
          lastFocusedAt: entry.lastFocusedAt,
        })),
        activeSessionId,
        maxCached
      );
      if (!victimId) break;
      disposeEntry(victimId);
    }
  };

  const router: ChatTurnRuntimeRouter = {
    maxCached,

    getActiveSessionId: () => activeSessionId,

    get: (sessionId) => entries.get(sessionId)?.runtime,

    getActive: () => (activeSessionId ? entries.get(activeSessionId)?.runtime : undefined),

    focus: async (sessionId, options) => {
      const epoch = ++focusEpoch;

      if (!sessionId) {
        activeSessionId = null;
        emit();
        return null;
      }

      const cached = entries.get(sessionId);
      if (cached) {
        cached.lastFocusedAt = Date.now();
        activeSessionId = sessionId;
        emit();
        return cached.runtime;
      }

      if (!options?.createRuntime) {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: 'focus 新建 Runtime 时缺少 createRuntime',
        });
      }

      const runtime = options.createRuntime();
      try {
        await runtime.bootstrap({ isNewSession: options.isNewSession ?? false });
      } catch (error) {
        // bootstrap 失败应已 dispose；再保险一次
        try {
          runtime.dispose();
        } catch {
          // ignore
        }
        if (epoch === focusEpoch) {
          emit();
        }
        throw error;
      }

      if (epoch !== focusEpoch) {
        runtime.dispose();
        return router.getActive() ?? null;
      }

      entries.set(sessionId, { runtime, lastFocusedAt: Date.now() });
      activeSessionId = sessionId;
      trimToLimit();
      emit();
      return runtime;
    },

    dispose: (sessionId) => {
      disposeEntry(sessionId);
      emit();
    },

    clear: () => {
      focusEpoch += 1;
      const sessionIds = [...entries.keys()];
      for (const sessionId of sessionIds) {
        disposeEntry(sessionId);
      }
      activeSessionId = null;
      emit();
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return router;
}

export const chatTurnRuntimeRouter = createChatTurnRuntimeRouter();

registerStore({
  id: 'chat.turn-runtime-router',
  scope: 'session',
  reset: () => {
    chatTurnRuntimeRouter.clear();
  },
});

/** 仅供脚手架测试注入独立 Router 实例。 */
export function createChatTurnRuntimeRouterForTest(maxCached?: number): ChatTurnRuntimeRouter {
  return createChatTurnRuntimeRouter(maxCached);
}

export { pickLruVictim } from './lruPolicy';
