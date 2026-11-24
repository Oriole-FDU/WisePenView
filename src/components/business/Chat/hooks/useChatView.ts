import { Chat as AiChat, useChat } from '@ai-sdk/react';
import { useState } from 'react';

import type { WisePenUIMessage } from '@/domains/ChatSession';
import { useChatRouterSnapshot } from '@/runtime/chat';

/** 前台 Chat 实例与消息投影；无前台时用空壳占位，避免 useChat 无 chat。 */
export function useChatView(sessionId: string | undefined) {
  const routerSnapshot = useChatRouterSnapshot();
  const [emptyChat] = useState(() => new AiChat<WisePenUIMessage>({ id: '__chat_router_empty__' }));
  const isCurrentSession = routerSnapshot.sessionId === sessionId;
  const { messages } = useChat({
    chat: (isCurrentSession ? routerSnapshot.chat : null) ?? emptyChat,
  });
  const runtime = isCurrentSession ? routerSnapshot.runtime : null;

  return {
    messages,
    phase: runtime?.phase ?? 'idle',
    canLoadMoreHistory: runtime ? runtime.historyPage < runtime.historyTotalPage : false,
    loadingMoreHistory: runtime?.historyLoadingMore ?? false,
  };
}
