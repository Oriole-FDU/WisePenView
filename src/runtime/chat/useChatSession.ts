import { Chat, useChat } from '@ai-sdk/react';
import { createContext, useCallback, useState, useSyncExternalStore } from 'react';

import type { WisePenUIMessage } from '@/domains/ChatSession';
import { useRequiredContext } from '@/hooks/useRequiredContext';
import { notifyError } from '@/utils/error';

import { getSessionPhase } from './_common/sessionState';
import type { createSessionCoordinator } from './SessionCoordinator/index.impl';

export const ChatSessionsContext = createContext<ReturnType<
  typeof createSessionCoordinator
> | null>(null);

export function useChatSessions() {
  return useRequiredContext(ChatSessionsContext, 'ChatRuntimeProvider');
}

export function useChatSession(sessionId: string | undefined) {
  const sessions = useChatSessions();
  const [emptyChat] = useState(() => new Chat<WisePenUIMessage>({}));
  const subscribe = useCallback(
    (listener: () => void) =>
      sessionId ? sessions.subscribe(sessionId, listener, notifyError) : () => undefined,
    [sessions, sessionId]
  );
  const snapshot = useSyncExternalStore(subscribe, () =>
    sessionId ? sessions.getSnapshot(sessionId) : undefined
  );
  const { messages, status } = useChat({ chat: snapshot?.chat ?? emptyChat });

  return {
    messages,
    phase: getSessionPhase(snapshot?.operation ?? null, status, messages.at(-1)),
    canLoadMoreHistory: snapshot ? snapshot.historyPage < snapshot.historyTotalPage : false,
    loadingInitialHistory:
      Boolean(sessionId) && (!snapshot || snapshot.initialHistory === 'loading'),
    loadingMoreHistory: snapshot?.historyLoadingMore ?? false,
  };
}
