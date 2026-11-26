import { useUnmount, useUnmountedRef } from 'ahooks';
import { type ReactNode, useState } from 'react';

import { createSessionCoordinator } from './SessionCoordinator/index.impl';
import { ChatSessionsContext } from './useChatSession';

export function ChatRuntimeProvider({ children }: { children: ReactNode }) {
  const [sessions] = useState(createSessionCoordinator);
  const unmounted = useUnmountedRef();

  useUnmount(() => {
    // StrictMode 重跑 effect 时会在该微任务之前重新挂载。
    queueMicrotask(() => {
      if (unmounted.current) void sessions.cleanup();
    });
  });

  return <ChatSessionsContext.Provider value={sessions}>{children}</ChatSessionsContext.Provider>;
}
