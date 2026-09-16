import { type ReactNode, useEffect, useState } from 'react';

import { ChatInputStoreContext, createChatInputStore } from './ChatInputStore';

interface ChatInputStoreProviderProps {
  children: ReactNode;
  sessionId?: string;
  promoteDraftToolSelection: boolean;
}

export function ChatInputStoreProvider({
  children,
  sessionId,
  promoteDraftToolSelection,
}: ChatInputStoreProviderProps) {
  const [store] = useState(createChatInputStore);

  /**
   * @wisepen-manual-effect
   * 执行时机：当前聊天会话切换，或新建会话首次取得后端 ID 时同步工具选择作用域。
   * 不可替代原因：工具勾选保存在 ChatInput 实例 store，需要响应父级会话身份变化并迁移 draft。
   * cleanup：没有订阅或异步任务，无需清理。
   */
  useEffect(() => {
    store.getState().setToolSelectionSession(sessionId, promoteDraftToolSelection);
  }, [promoteDraftToolSelection, sessionId, store]);

  return <ChatInputStoreContext.Provider value={store}>{children}</ChatInputStoreContext.Provider>;
}
