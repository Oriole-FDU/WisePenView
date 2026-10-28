import { type ReactNode, useEffect, useState } from 'react';

import { clearFrontendStates, FRONTEND_STATE_SOURCE } from '@/frontendState';

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
   * 执行时机：目前会话切换或新建会话取得后端 ID 时，同步输入与工具选择的作用域。
   * 不可替代原因：ChatInput 的实例 store 需响应 URL 的会话身份；草稿升级保留输入与附件，
   * 切换至其他会话则清除旧输入，让尚未完成的操作失效。
   * cleanup：没有订阅或异步任务，无需清理。
   */
  useEffect(() => {
    const previousVersion = store.getState().sessionVersion;
    store.getState().setToolSelectionSession(sessionId, promoteDraftToolSelection);
    if (store.getState().sessionVersion !== previousVersion) {
      clearFrontendStates({ source: FRONTEND_STATE_SOURCE.INPUT });
    }
  }, [promoteDraftToolSelection, sessionId, store]);

  /**
   * @wisepen-manual-effect
   * 执行时机：输入区实例卸载时清除未发送的资源引用。
   * 不可替代原因：资源引用在应用级模块，需与输入区实例同步结束。
   * cleanup：移除输入区写入的资源引用。
   */
  useEffect(() => () => clearFrontendStates({ source: FRONTEND_STATE_SOURCE.INPUT }), []);

  return <ChatInputStoreContext.Provider value={store}>{children}</ChatInputStoreContext.Provider>;
}
