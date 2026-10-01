import { toast } from '@heroui/react';
import { useLatest, useUnmountedRef } from 'ahooks';
import { useState } from 'react';

import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { parseErrorMessage } from '@/utils/error';

import type { SendOptions } from '../ChatInput/index.type';
import type { ChatPanelAgentDebugConfig } from '../index.type';

interface UseAgentDebugSendControllerOptions {
  agentDebug?: ChatPanelAgentDebugConfig;
  send: (text: string, opts?: SendOptions) => Promise<boolean>;
}

interface PendingDebugSend {
  locationKey: string;
  text: string;
  opts?: SendOptions;
  resolve: (sent: boolean) => void;
}

/**
 * Agent 调试域：发送前保存调试草稿的独立子流程。
 *
 * 命中拦截条件时不直接发送，而是挂起本次发送，等用户在弹窗里确认保存或放弃后再决定是否送出。
 */
export function useAgentDebugSendController({
  agentDebug,
  send,
}: UseAgentDebugSendControllerOptions) {
  const { locationKey } = useChatSessionRoute();
  const routeLatest = useLatest({ locationKey });
  const unmountedRef = useUnmountedRef();
  const [pendingDebugSend, setPendingDebugSend] = useState<PendingDebugSend | null>(null);
  const [savingDebugDraft, setSavingDebugDraft] = useState(false);

  /** 需要先确认保存草稿时返回挂起的发送 Promise，否则返回 null 由调用方直接发送。 */
  const tryInterceptSend = (text: string, opts?: SendOptions): Promise<boolean> | null => {
    if (unmountedRef.current || routeLatest.current.locationKey !== locationKey) return null;
    if (!agentDebug?.isDirty || opts?.selectedAgent?.agentId !== agentDebug.agent.agentId) {
      return null;
    }
    return new Promise<boolean>((resolve) => {
      setPendingDebugSend({ text, opts, resolve, locationKey });
    });
  };

  const resolvePendingDebugSend = (sent: boolean) => {
    pendingDebugSend?.resolve(sent);
    setPendingDebugSend(null);
  };

  const cancel = () => {
    if (savingDebugDraft) return;
    resolvePendingDebugSend(false);
  };

  const confirm = async () => {
    if (!pendingDebugSend || !agentDebug) return;
    setSavingDebugDraft(true);
    try {
      const saved = await agentDebug.onSaveDraft();
      if (
        !saved ||
        unmountedRef.current ||
        routeLatest.current.locationKey !== pendingDebugSend.locationKey
      ) {
        resolvePendingDebugSend(false);
        return;
      }
      const sent = await send(pendingDebugSend.text, pendingDebugSend.opts);
      resolvePendingDebugSend(sent);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      resolvePendingDebugSend(false);
    } finally {
      setSavingDebugDraft(false);
    }
  };

  return {
    cancel,
    confirm,
    isDialogOpen: pendingDebugSend != null,
    saving: savingDebugDraft,
    tryInterceptSend,
  };
}
