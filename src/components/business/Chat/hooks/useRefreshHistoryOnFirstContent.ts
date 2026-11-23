import { useEffect } from 'react';

import type { WisePenUIMessage } from '@/domains/ChatSession';

import { hasRenderableChatContent } from '../model/chatTurnModel';

/**
 * 新建会话首个可渲染内容到达后，触发侧栏历史刷新。
 * 驱动变量为 `sessionId` + `messages`；pending 标记经 ref 读取（身份稳定，不参与驱动）。
 */
export function useRefreshHistoryOnFirstContent(
  sessionId: string | undefined,
  messages: WisePenUIMessage[],
  pendingSessionIdRef: { current: string | undefined },
  requestRefresh: () => void
): void {
  /**
   * @wisepen-manual-effect
   * 执行时机：新建会话首个可渲染内容到达后刷新侧栏列表。
   * 不可替代原因：新建标记与可渲染状态分属不同观察点，需在顶层汇合。
   * cleanup：无订阅。
   */
  useEffect(() => {
    if (sessionId == null || sessionId === '') return;
    if (pendingSessionIdRef.current !== sessionId) return;
    if (!hasRenderableChatContent(messages)) return;
    requestRefresh();
    pendingSessionIdRef.current = undefined;
  }, [sessionId, messages, requestRefresh, pendingSessionIdRef]);
}
