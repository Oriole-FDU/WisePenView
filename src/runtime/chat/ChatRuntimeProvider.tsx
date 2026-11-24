import { useUnmount, useUnmountedRef } from 'ahooks';
import { type ReactNode, useState } from 'react';

import { createChatRouter } from './ChatRouter/index.impl';
import { ChatRouterContext } from './useChatRouter';

export function ChatRuntimeProvider({ children }: { children: ReactNode }) {
  const [router] = useState(createChatRouter);
  const unmounted = useUnmountedRef();

  useUnmount(() => {
    // StrictMode 重跑 effect 时会在该微任务之前重新挂载。
    queueMicrotask(() => {
      if (unmounted.current) void router.cleanup();
    });
  });

  return <ChatRouterContext.Provider value={router}>{children}</ChatRouterContext.Provider>;
}
