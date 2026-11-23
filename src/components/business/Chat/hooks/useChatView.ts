import { Chat as AiChat, useChat } from '@ai-sdk/react';
import { useState } from 'react';

import type { WisePenUIMessage } from '@/domains/ChatSession';
import { useChatRouterSnapshot } from '@/runtime/chat';

/** 前台 Chat 实例与消息投影；无前台时用空壳占位，避免 useChat 无 chat。 */
export function useChatView() {
  const routerSnapshot = useChatRouterSnapshot();
  const [emptyChat] = useState(() => new AiChat<WisePenUIMessage>({ id: '__chat_router_empty__' }));
  const chat = routerSnapshot.chat ?? emptyChat;
  const { messages, status } = useChat({ chat });
  const runtime = routerSnapshot.runtime;

  return {
    messages,
    status,
    runtime,
    canLoadMoreHistory: runtime ? runtime.historyPage < runtime.historyTotalPage : false,
    loadingMoreHistory: runtime?.historyLoadingMore ?? false,
  };
}
