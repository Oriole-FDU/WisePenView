/**
 * 组件消费入口：向 Router focus 当前 session，订阅 Runtime View。
 */
import { useLatest } from 'ahooks';
import type { ChatStatus } from 'ai';
import { useEffect, useSyncExternalStore } from 'react';

import { useChatTurnService } from '@/domains';

import type { WisePenUIMessage } from '../../entity/message';
import type { SendTurnMessageOptions } from '../../service/index.type';
import type { ToolApprovalRequest } from '../approval/toolApproval';
import { ChatTurnRuntime } from '../chatTurnRuntime';
import { LIFECYCLE_PHASE } from '../lifecycle';
import { hasRenderableChatContent } from '../message/chatTurnModel';
import { chatTurnRuntimeRouter } from '../router/chatTurnRuntimeRouter';
import type { RuntimeView } from '../types';

const EMPTY_VIEW: RuntimeView = {
  lifecycle: LIFECYCLE_PHASE.disposed,
  connectPhase: 'idle',
  messages: [],
  status: 'ready',
  loadingInitial: false,
  loadingMore: false,
  canLoadMore: false,
  cancelling: false,
  connectActive: false,
  pendingApproval: undefined,
  approvalSubmitting: false,
};

export interface UseChatRuntimeOptions {
  sessionId: string;
  model?: string;
  isNewSession: boolean;
  onError?: (error: Error) => void;
}

export interface UseChatRuntimeResult {
  approval: {
    decide: (toolCallId: string, approved: boolean) => void;
    pending: ToolApprovalRequest | undefined;
    submitting: boolean;
  };
  messages: WisePenUIMessage[];
  renderable: boolean;
  status: ChatStatus;
  send: (query: string, options?: SendTurnMessageOptions) => Promise<void>;
  cancel: () => Promise<void>;
  cancelling: boolean;
  connectActive: boolean;
  history: {
    canLoadMore: boolean;
    loadMore: () => Promise<void>;
    loadingInitial: boolean;
    loadingMore: boolean;
  };
}

export function useChatRuntime({
  sessionId,
  model,
  isNewSession,
  onError,
}: UseChatRuntimeOptions): UseChatRuntimeResult {
  const service = useChatTurnService();
  const sessionKey = sessionId || null;
  const serviceLatest = useLatest(service);
  const modelLatest = useLatest(model);
  const onErrorLatest = useLatest(onError);

  /**
   * @wisepen-manual-effect
   * 执行时机：route sessionId / isNewSession 变化时向 Router focus。
   * 不可替代原因：Router 持有跨组件实例，focus+bootstrap 是异步外部副作用。
   * cleanup：仅取消陈旧回调；不停泵、不 dispose（后台持续拉流）。
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (!sessionKey) {
          await chatTurnRuntimeRouter.focus(null);
          return;
        }
        await chatTurnRuntimeRouter.focus(sessionKey, {
          isNewSession,
          createRuntime: () =>
            new ChatTurnRuntime({
              sessionId: sessionKey,
              service: serviceLatest.current,
              model: modelLatest.current,
              onError: (error) => onErrorLatest.current?.(error),
            }),
        });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error) onErrorLatest.current?.(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionKey, isNewSession, serviceLatest, modelLatest, onErrorLatest]);

  const active = useSyncExternalStore(
    chatTurnRuntimeRouter.subscribe,
    () => chatTurnRuntimeRouter.getActive(),
    () => undefined
  );

  const runtime =
    active && sessionKey && active.sessionId === sessionKey ? (active as ChatTurnRuntime) : null;

  const view = useSyncExternalStore(
    (listener) => (runtime ? runtime.subscribe(listener) : () => undefined),
    () => runtime?.getView() ?? EMPTY_VIEW,
    () => EMPTY_VIEW
  );

  return {
    approval: {
      decide: (toolCallId, approved) => {
        runtime?.decideApproval(toolCallId, approved);
      },
      pending: view.pendingApproval,
      submitting: view.approvalSubmitting,
    },
    messages: view.messages,
    renderable: hasRenderableChatContent(view.messages),
    status: view.status,
    send: async (query, options) => {
      if (!runtime) return;
      await runtime.send(query, options);
    },
    cancel: async () => {
      if (!runtime) return;
      await runtime.cancel();
    },
    cancelling: view.cancelling,
    connectActive: view.connectActive,
    history: {
      canLoadMore: view.canLoadMore,
      loadMore: async () => {
        if (!runtime) return;
        await runtime.loadMore();
      },
      loadingInitial: view.loadingInitial,
      loadingMore: view.loadingMore,
    },
  };
}
