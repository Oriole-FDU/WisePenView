import { toast } from '@heroui/react';
import { useEffect, useState } from 'react';

import { captureException } from '@/observability';
import { getChatRouter } from '@/runtime/chat';
import { parseErrorMessage } from '@/utils/error';

/**
 * 路由 sessionId → ChatRouter 前台对齐。
 * 驱动变量仅为 `sessionId`；router 经单例读取，竞态由 effect cleanup 的 cancelled 门闩处理。
 */
export function useSyncChatRouteForeground(sessionId: string | undefined): boolean {
  const [focusing, setFocusing] = useState(false);

  /**
   * @wisepen-manual-effect
   * 执行时机：路由 sessionId 变化时对齐 runtime 前台。
   * 不可替代原因：URL 身份与池内 runtime 的 focus/leave 是跨层副作用。
   * cleanup：标记本次对齐失效，避免过期 focus 回写。
   */
  useEffect(() => {
    const router = getChatRouter();
    let cancelled = false;

    const syncForeground = async () => {
      if (!sessionId) {
        router.leaveSession();
        if (!cancelled) setFocusing(false);
        return;
      }

      if (!cancelled) setFocusing(true);
      try {
        await router.focusSession(sessionId);
      } catch (error) {
        if (cancelled) return;
        captureException(error, {
          detector: 'application-handled',
          operation: 'chat.bootstrap',
        });
        toast.danger(parseErrorMessage(error));
      } finally {
        if (!cancelled) setFocusing(false);
      }
    };

    void syncForeground();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return focusing;
}
