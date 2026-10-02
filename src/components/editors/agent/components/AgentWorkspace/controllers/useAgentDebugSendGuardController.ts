import { useLatest, useMemoizedFn, useUnmountedRef } from 'ahooks';
import { useEffect, useRef, useState } from 'react';

import type { ChatSendInterceptor } from '@/components/business/ChatPanel/index.type';
import type { ChatAgentOption } from '@/domains/Chat';

interface UseAgentDebugSendGuardControllerOptions {
  /** 注入聊天输入选择器的草稿 Agent；不在可调试状态时为 undefined */
  agent?: ChatAgentOption;
  /** 草稿是否有未保存修改 */
  isDirty: boolean;
  /** 保存草稿，返回是否保存成功 */
  saveDraft: () => Promise<boolean>;
}

/**
 * Agent 调试域：挂起发往未保存草稿 Agent 的发送。
 *
 * 命中拦截条件时不直接发送，而是等用户在弹窗里确认保存或放弃后，
 * 再把结论交回聊天面板决定是否送出；守卫只负责结论，不持有发送能力。
 */
export function useAgentDebugSendGuardController({
  agent,
  isDirty,
  saveDraft,
}: UseAgentDebugSendGuardControllerOptions) {
  const unmountedRef = useUnmountedRef();
  const agentLatest = useLatest(agent);
  const dirtyLatest = useLatest(isDirty);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const resolverRef = useRef<((accepted: boolean) => void) | null>(null);

  /** 结束挂起的发送：先回结论给聊天面板，再收起弹窗。 */
  const settlePending = useMemoizedFn((accepted: boolean) => {
    resolverRef.current?.(accepted);
    resolverRef.current = null;
    if (!unmountedRef.current) setDialogOpen(false);
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：守卫控制器卸载时。
   * 不可替代原因：挂起的发送 Promise 由本层持有，只有卸载点能把“放弃”回执交回聊天面板。
   * cleanup：本 effect 只做卸载清理，不订阅外部资源，无需额外释放。
   */
  useEffect(() => () => settlePending(false), [settlePending]);

  /** 命中未保存草稿时返回挂起的发送 Promise，否则返回 null 由聊天面板直接发送。 */
  const interceptSend = useMemoizedFn<ChatSendInterceptor>((_text, opts) => {
    const currentAgent = agentLatest.current;
    if (!currentAgent || !dirtyLatest.current) return null;
    if (opts?.selectedAgent?.agentId !== currentAgent.agentId) return null;
    return new Promise<boolean>((resolve) => {
      // 重复触发时先放弃上一次挂起的发送，避免调用方一直等待。
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setDialogOpen(true);
    });
  });

  const cancel = useMemoizedFn(() => {
    if (saving) return;
    settlePending(false);
  });

  const confirm = useMemoizedFn(async () => {
    if (!resolverRef.current) return;
    setSaving(true);
    try {
      settlePending(await saveDraft());
    } catch {
      settlePending(false);
    } finally {
      if (!unmountedRef.current) setSaving(false);
    }
  });

  return { cancel, confirm, interceptSend, isDialogOpen, saving };
}
