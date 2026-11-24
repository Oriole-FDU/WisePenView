import { createContext, useSyncExternalStore } from 'react';

import { useRequiredContext } from '@/hooks/useRequiredContext';

import type { ChatRouter } from './ChatRouter/index.type';

export const ChatRouterContext = createContext<ChatRouter | null>(null);

export function useChatRouter(): ChatRouter {
  return useRequiredContext(ChatRouterContext, 'ChatRuntimeProvider');
}

export function useChatRouterSnapshot() {
  const router = useChatRouter();
  return useSyncExternalStore(router.subscribe, router.getSnapshot, router.getSnapshot);
}
