import { type ReactNode, useEffect, useState } from 'react';

import { createChatInputStore } from './ChatInputStore';
import { ChatInputStoreContext } from './ChatInputStoreContext';

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
   * 执行时机：目前會話切換或新建會話取得後端 ID 時，同步輸入與工具選擇的作用域。
   * 不可替代原因：ChatInput 的實例 store 需響應 URL 的會話身份；草稿升級保留輸入與附件，
   * 切換至其他會話則清除舊輸入，讓尚未完成的操作失效。
   * cleanup：没有订阅或异步任务，无需清理。
   */
  useEffect(() => {
    store.getState().setToolSelectionSession(sessionId, promoteDraftToolSelection);
  }, [promoteDraftToolSelection, sessionId, store]);

  return <ChatInputStoreContext.Provider value={store}>{children}</ChatInputStoreContext.Provider>;
}
