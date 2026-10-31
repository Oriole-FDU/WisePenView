import { createStore } from 'zustand/vanilla';

import { registerStore } from '@/store/lifecycle';

import type { ChatSession } from '../service/index.type';

interface SessionCache {
  sessions: ReadonlyMap<string, ChatSession>;
  generation: number;
}

// 只缓存服务器数据；目前选中的 ID 一律从 URL 取得，不持久化或反向导航。
export const chatSessionCache = createStore<SessionCache>(() => ({
  sessions: new Map(),
  generation: 0,
}));

export const getSessionCacheSnapshot = chatSessionCache.getState;

export function cacheSessions(
  sessions: ChatSession[],
  snapshot: SessionCache,
  fromList = false
): void {
  chatSessionCache.setState((state) => {
    if (state.generation !== snapshot.generation) return state;
    const next = new Map(state.sessions);
    for (const session of sessions) {
      // 列表开始后若已有重新命名／Agent 更新，不让旧列表覆盖新数据。
      if (fromList && state.sessions.get(session.id) !== snapshot.sessions.get(session.id))
        continue;
      next.set(session.id, session);
    }
    return { sessions: next };
  });
}

export function removeCachedSession(sessionId: string, snapshot: SessionCache): void {
  chatSessionCache.setState((state) => {
    if (state.generation !== snapshot.generation) return state;
    const sessions = new Map(state.sessions);
    sessions.delete(sessionId);
    return { sessions };
  });
}

registerStore({
  id: 'chat.session-metadata',
  scope: 'session',
  reset: () =>
    chatSessionCache.setState((state) => ({
      sessions: new Map(),
      generation: state.generation + 1,
    })),
});
