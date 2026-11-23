import { useSyncExternalStore } from 'react';

import type { ChatRouterSnapshot } from './ChatRouter/index.type';
import { getChatRouter } from './getChatRouter';

/** 订阅对话窄门快照：前台 session / chat / runtime 产品态 */
export function useChatRouterSnapshot(): ChatRouterSnapshot {
  const router = getChatRouter();
  return useSyncExternalStore(
    (onStoreChange) => router.subscribe(onStoreChange),
    () => router.getSnapshot(),
    () => router.getSnapshot()
  );
}
