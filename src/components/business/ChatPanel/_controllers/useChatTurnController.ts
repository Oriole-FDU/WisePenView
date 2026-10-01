import { toast } from '@heroui/react';
import { useLatest, useUnmountedRef } from 'ahooks';
import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useChatService } from '@/domains';
import {
  type ChatModel,
  type CreateSessionRequest,
  useChatHistory,
  useChatSession,
  type WisePenUIMessage,
} from '@/domains/Chat';
import { useApi } from '@/hooks/useApi';
import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useAppAuth } from '@/layouts/App/_context';
import { parseErrorMessage } from '@/utils/error';

import type { SendOptions } from '../ChatInput/index.type';
import type { ResourceChatProtocolPort } from '../ResourceChatProtocol';

interface UseChatTurnControllerOptions {
  /** 会话域提供的按需建会话能力，用于发送前确保存在目标会话 */
  ensureSession: (agentParams?: CreateSessionRequest) => Promise<string | undefined>;
  isNewlyCreatedSession: (sessionId: string) => boolean;
  clearNewlyCreatedSession: (sessionId: string) => void;
  resourceChat?: ResourceChatProtocolPort;
}

function listPendingToolApprovalIds(messages: readonly WisePenUIMessage[]): string[] {
  return Array.from(
    new Set(
      messages.flatMap((message) =>
        message.parts.flatMap((part) =>
          isToolUIPart(part) && part.state === 'approval-requested' ? [part.toolCallId] : []
        )
      )
    )
  );
}

/**
 * 对话域：当前会话的一轮对话生命周期。
 *
 * 历史分页、流式恢复、发送取消和工具审批共享同一组不变量（消息列表、运行状态、当前轮次），
 * 因此同属一个 Controller，按 `history` / `approval` 命名空间输出。
 */
export function useChatTurnController({
  ensureSession,
  isNewlyCreatedSession,
  clearNewlyCreatedSession,
  resourceChat,
}: UseChatTurnControllerOptions) {
  const { t } = useTranslation(['chat', 'common']);
  const appAuth = useAppAuth();
  const chatService = useChatService();
  const { sessionId: currentSessionId, locationKey } = useChatSessionRoute();
  const routeLatest = useLatest({ sessionId: currentSessionId, locationKey });
  const unmountedRef = useUnmountedRef();
  const resourceStateProvider = resourceChat?.provider;
  const resourceChatContext = resourceChat?.context;
  const clearResourceChatContext = resourceChat?.clearContext;

  const [currentModel, setCurrentModel] = useState<ChatModel | null>(null);
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null);
  const [toolApprovalDecisions, setToolApprovalDecisions] = useState<Record<string, boolean>>({});

  const {
    messages,
    status,
    setMessages,
    sendSessionMessage,
    recoverSession,
    stop,
    resumeSessionStream,
  } = useChatSession({
    sessionId: currentSessionId ?? '',
    model: currentModel?.modelId,
    getActiveTurnId: chatService.getActiveTurnId,
    onError: (error) => {
      toast.danger(parseErrorMessage(error));
    },
  });

  const { runAsync: runLoadSessionHistory } = useApi(
    async (sessionId: string, page: number, size: number) =>
      chatService.listHistoryMessages({ sessionId, page, size }),
    { manual: true }
  );
  const {
    canLoadMore: canLoadMoreHistory,
    loadingMore: loadingMoreHistory,
    loadingInitial: loadingInitialHistory,
    replaceHistory,
    prependHistory,
    clearConversation,
  } = useChatHistory({
    sessionId: currentSessionId ?? null,
    pageSize: 100,
    loadPage: runLoadSessionHistory,
    setMessages,
  });

  const hasRenderableChatContent = messages.some((message) =>
    message.parts.some((part) => {
      if (isTextUIPart(part) || isReasoningUIPart(part)) return part.text.trim().length > 0;
      return isToolUIPart(part);
    })
  );

  const loadHistoryMessages = async (sessionId: string): Promise<boolean> => {
    try {
      return await replaceHistory(sessionId);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      clearConversation();
      return false;
    }
  };
  const historyActionsLatest = useLatest({
    clearConversation,
    loadHistoryMessages,
    resumeSessionStream,
  });

  const loadMoreHistoryMessages = async () => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    try {
      await prependHistory();
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  /**
   * @wisepen-manual-effect
   * 执行时机：当前会话 ID 首次可用或发生切换时加载历史，并在历史成功后检查 active turn。
   * 不可替代原因：历史加载和 SSE 重连都是异步外部副作用，必须按顺序写入当前 Chat 运行时。
   * cleanup：标记本次会话加载失效并中止旧 Chat 的客户端连接，配合 useChatHistory 与
   * useChatSession 丢弃旧请求结果；stop 不调用后端 cancel，后台 turn 仍可被后续页面恢复。
   */
  useEffect(() => {
    if (!appAuth.isAuthenticated) {
      historyActionsLatest.current.clearConversation();
      return;
    }
    if (!currentSessionId) {
      historyActionsLatest.current.clearConversation();
      return;
    }
    const targetSessionId = currentSessionId;
    const actions = historyActionsLatest.current;
    const isNewSession = isNewlyCreatedSession(targetSessionId);
    let cancelled = false;
    void (async () => {
      if (isNewSession) return;
      const loaded = await actions.loadHistoryMessages(targetSessionId);
      if (!loaded || cancelled) return;
      if (routeLatest.current.sessionId !== targetSessionId) return;
      await actions.resumeSessionStream();
    })();
    return () => {
      cancelled = true;
      clearNewlyCreatedSession(targetSessionId);
      void stop();
    };
  }, [
    appAuth.isAuthenticated,
    clearNewlyCreatedSession,
    currentSessionId,
    historyActionsLatest,
    isNewlyCreatedSession,
    routeLatest,
    stop,
  ]);

  /** 发送一轮消息：校验登录与资源上下文，必要时先建立会话，再把前端状态随消息提交。 */
  const send = async (text: string, opts?: SendOptions): Promise<boolean> => {
    if (unmountedRef.current || routeLatest.current.locationKey !== locationKey) return false;
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return false;
    }
    const targetModel = opts?.model ?? currentModel;
    if (!targetModel) return false;
    const sendBlockedReason = resourceStateProvider?.getBlockedReason?.();
    if (sendBlockedReason) {
      toast.warning(sendBlockedReason);
      return false;
    }
    if (resourceChatContext && resourceChatContext.providerKey !== resourceStateProvider?.key) {
      toast.warning(t('panel.contextMismatch'));
      return false;
    }
    setCurrentModel(targetModel);
    const selectedAgent = opts?.selectedAgent;
    let agentParams: CreateSessionRequest | undefined;
    if (selectedAgent?.resourceId) {
      agentParams = {
        agentId: selectedAgent.resourceId,
        agentVersion: selectedAgent.agentVersion,
      };
    } else if (selectedAgent?.isDefault || selectedAgent?.source === 'DEFAULT') {
      agentParams = { agentId: null, agentVersion: null };
    }

    let targetSessionId: string | undefined;
    try {
      targetSessionId = await ensureSession(agentParams);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      return false;
    }
    if (!targetSessionId) return false;

    const selectedSkillIds = opts?.selectedSkills?.map((skill) => skill.skillId);
    const resourceSkillIds = resourceStateProvider?.onDemandSkillIds;
    const onDemandSkillIds =
      selectedSkillIds !== undefined || resourceSkillIds !== undefined
        ? Array.from(new Set([...(selectedSkillIds ?? []), ...(resourceSkillIds ?? [])]))
        : undefined;

    void sendSessionMessage(text, {
      model: targetModel.modelId,
      providerId: targetModel.providerId,
      sessionId: targetSessionId,
      frontendStates: [
        ...(resourceStateProvider?.getStates() ?? []),
        ...(resourceChatContext?.states ?? []),
      ],
      selectedResources: opts?.activeDocRefs,
      uploadedAttachments: opts?.activeAttachments,
      toolSelectionOverrides: opts?.toolSelectionOverrides,
      onDemandSkillIds,
    }).catch((error) => {
      toast.danger(parseErrorMessage(error));
    });

    if (resourceChatContext) {
      clearResourceChatContext?.(resourceChatContext);
    }
    return true;
  };

  const cancel = async (): Promise<void> => {
    const targetSessionId = currentSessionId;
    if (!targetSessionId || cancellingSessionId === targetSessionId) return;

    setCancellingSessionId(targetSessionId);
    void stop();
    try {
      await chatService.cancelTurn(targetSessionId);
    } catch (error) {
      toast.danger(t('input.cancelFailed', { error: parseErrorMessage(error) }));
    } finally {
      setCancellingSessionId((sessionId) => (sessionId === targetSessionId ? null : sessionId));
    }
  };

  /** 记录审批决定；待审批项全部有结论后，用该结论恢复同一轮对话。 */
  const decideToolApproval = (toolCallId: string, approved: boolean) => {
    if (!currentSessionId || status === 'submitted' || status === 'streaming') return;

    const pendingToolCallIds = listPendingToolApprovalIds(messages);
    if (!pendingToolCallIds.includes(toolCallId)) return;

    const nextDecisions = { ...toolApprovalDecisions, [toolCallId]: approved };
    setToolApprovalDecisions(nextDecisions);
    if (pendingToolCallIds.some((pendingId) => nextDecisions[pendingId] === undefined)) return;

    const toolApprovalStatus = pendingToolCallIds.map((pendingId) => ({
      tool_call_id: pendingId,
      approved: nextDecisions[pendingId] ?? false,
    }));
    void recoverSession(toolApprovalStatus).finally(() => {
      setToolApprovalDecisions((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([id]) => !pendingToolCallIds.includes(id))
        )
      );
    });
  };

  return {
    approval: {
      decide: decideToolApproval,
      decisions: toolApprovalDecisions,
    },
    cancel,
    cancelling: cancellingSessionId === currentSessionId,
    currentModel,
    hasRenderableChatContent,
    history: {
      canLoadMore: canLoadMoreHistory,
      loadMore: loadMoreHistoryMessages,
      loadingInitial: loadingInitialHistory,
      loadingMore: loadingMoreHistory,
    },
    isEmpty: messages.length === 0,
    messages,
    send,
    status,
  };
}
