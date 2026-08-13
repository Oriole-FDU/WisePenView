import { useChatPanelStore } from '@/components/ChatPanel/_store/useChatPanelStore';
import { useChatSessionHistoryRefreshStore } from '@/components/ChatPanel/_store/useChatSessionHistoryRefreshStore';
import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import {
  clearNewChatSessionStore,
  useNewChatSessionStore,
} from '@/components/ChatPanel/_store/useNewChatSessionStore';
import type { ChatPanelProps } from '@/components/ChatPanel/index.type';
import { useChatService } from '@/domains';
import {
  useChatHistory,
  useChatSession,
  type ChatModel,
  type ChatSession,
  type ClientToolCallEvent,
  type ClientToolExecutionResult,
  type CreateSessionRequest,
} from '@/domains/Chat';
import { useApi } from '@/hooks/useApi';
import { useAppAuth } from '@/layouts/App/AppAuthContext';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { buildChatPath } from '@/utils/navigation/appRoute';
import { toast } from '@heroui/react';
import { useLatest } from 'ahooks';
import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { SendOptions } from './ChatInput/index.type';

type UseChatPanelControllerOptions = Pick<
  ChatPanelProps,
  'onNewChat' | 'resourceChat' | 'agentDebug'
> & { fullWidth: boolean };

interface PendingDebugSend {
  text: string;
  opts?: SendOptions;
  resolve: (sent: boolean) => void;
}

export function useChatPanelController({
  fullWidth,
  onNewChat,
  resourceChat,
  agentDebug,
}: UseChatPanelControllerOptions) {
  const { t } = useTranslation(['chat', 'common']);
  const navigate = useNavigate();
  const appAuth = useAppAuth();
  const chatService = useChatService();
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const setChatPanelDraftOpen = useChatPanelStore((state) => state.setChatPanelDraftOpen);
  const requestChatSessionHistoryRefresh = useChatSessionHistoryRefreshStore(
    (state) => state.requestRefresh
  );
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const currentSessionTitle = useCurrentChatSessionStore((state) => state.currentSessionTitle);
  const currentSessionAgentId = useCurrentChatSessionStore((state) => state.currentSessionAgentId);
  const currentSessionAgentVersion = useCurrentChatSessionStore(
    (state) => state.currentSessionAgentVersion
  );
  const setCurrentSession = useCurrentChatSessionStore((state) => state.setCurrentSession);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const resourceStateProvider = resourceChat?.provider;
  const resourceChatContext = resourceChat?.context;
  const clearResourceChatContext = resourceChat?.clearContext;

  const [currentModel, setCurrentModel] = useState<ChatModel | null>(null);
  const [sessionBarOpen, setSessionBarOpen] = useState(false);
  const [pendingDebugSend, setPendingDebugSend] = useState<PendingDebugSend | null>(null);
  const [savingDebugDraft, setSavingDebugDraft] = useState(false);

  const handleClientToolCall = async (
    event: ClientToolCallEvent
  ): Promise<ClientToolExecutionResult> => {
    const handler = resourceStateProvider?.clientToolHandlers?.[event.toolName];
    if (!handler) {
      return {
        toolCallId: event.toolCallId,
        errorText: `当前页面并未提供工具 '${event.toolName}'`,
      };
    }

    try {
      const output = await handler({
        sessionId: event.sessionId,
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        input: event.input,
      });
      return {
        toolCallId: event.toolCallId,
        output,
      };
    } catch (error) {
      const message = parseErrorMessage(error);
      toast.danger(message);
      return {
        toolCallId: event.toolCallId,
        errorText: message,
      };
    }
  };

  const { messages, status, setMessages, sendSessionMessage, stop } = useChatSession({
    sessionId: currentSessionId ?? '',
    model: currentModel?.modelId,
    onClientToolCall: handleClientToolCall,
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
  const { runAsync: runCreateSession } = useApi(
    (params?: CreateSessionRequest) => chatService.createSession(params),
    { manual: true }
  );
  const { runAsync: runSetSessionAgent } = useApi(
    (params: { sessionId: string; agentId?: string | null; agentVersion?: number | null }) =>
      chatService.setSessionAgent(params),
    { manual: true }
  );
  const hasRenderableChatContent = messages.some((message) =>
    message.parts.some((part) => {
      if (isTextUIPart(part) || isReasoningUIPart(part)) return part.text.trim().length > 0;
      return isToolUIPart(part);
    })
  );

  /**
   * @wisepen-manual-effect
   * 执行时机：新建会话收到首个可渲染内容后通知侧栏刷新历史列表。
   * 不可替代原因：新会话标记与侧栏刷新版本位于两个独立 Zustand store。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    if (currentSessionId == null || currentSessionId === '') return;
    const pendingId = useNewChatSessionStore.getState().newChatSessionId;
    if (pendingId !== currentSessionId) return;
    if (!hasRenderableChatContent) return;
    requestChatSessionHistoryRefresh();
    clearNewChatSessionStore();
  }, [currentSessionId, hasRenderableChatContent, requestChatSessionHistoryRefresh]);

  const panelTitle = currentSessionTitle || t('panel.newChat');

  const ensureChatSession = async (agentParams?: CreateSessionRequest): Promise<string> => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: t('input.loginRequired'),
      });
    }
    const existingSessionId =
      useCurrentChatSessionStore.getState().currentSessionId ?? currentSessionId;
    if (existingSessionId) {
      const sessionAgentMatched =
        !agentParams ||
        (agentParams.agentId == null
          ? currentSessionAgentId == null
          : currentSessionAgentId === agentParams.agentId &&
            (agentParams.agentVersion == null ||
              currentSessionAgentVersion === agentParams.agentVersion));
      if (!sessionAgentMatched) {
        const updatedSession = await runSetSessionAgent({
          sessionId: existingSessionId,
          agentId: agentParams?.agentId,
          agentVersion: agentParams?.agentVersion,
        });
        setCurrentSession(updatedSession);
      }
      return existingSessionId;
    }

    const createdSession = await runCreateSession(agentParams);
    useNewChatSessionStore.getState().setNewChatSessionId(createdSession.id);
    setCurrentSession(createdSession);
    requestChatSessionHistoryRefresh();
    setChatPanelDraftOpen(false);
    if (fullWidth) {
      navigate(buildChatPath(createdSession.id), { replace: true });
    }
    return createdSession.id;
  };

  const loadHistoryMessages = async (sessionId: string) => {
    try {
      await replaceHistory(sessionId);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      clearConversation();
    }
  };
  const historyActionsLatest = useLatest({ clearConversation, loadHistoryMessages });

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

  const sendImmediately = async (text: string, opts?: SendOptions): Promise<boolean> => {
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

    let targetSessionId: string;
    try {
      targetSessionId = await ensureChatSession(agentParams);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      return false;
    }

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
      onDemandSkillIds: opts?.selectedSkills?.map((skill) => skill.skillId),
      allowToolNames: [
        ...(resourceStateProvider?.allowToolNames ?? []),
        ...(opts?.selectedTools?.map((tool) => tool.toolId) ?? []),
      ],
      forceEnabledSkillIds: [...(resourceStateProvider?.forceEnabledSkillIds ?? [])],
      clientToolCapabilities: [...(resourceStateProvider?.clientToolCapabilities ?? [])],
    }).catch((error) => {
      toast.danger(parseErrorMessage(error));
    });

    if (resourceChatContext) {
      clearResourceChatContext?.(resourceChatContext);
    }
    return true;
  };

  const handleSend = async (text: string, opts?: SendOptions): Promise<boolean> => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return false;
    }
    if (agentDebug?.isDirty && opts?.selectedAgent?.agentId === agentDebug.agent.agentId) {
      return new Promise<boolean>((resolve) => {
        setPendingDebugSend({ text, opts, resolve });
      });
    }
    return sendImmediately(text, opts);
  };

  const resolvePendingDebugSend = (sent: boolean) => {
    pendingDebugSend?.resolve(sent);
    setPendingDebugSend(null);
  };

  const handleCancelDebugSend = () => {
    if (savingDebugDraft) return;
    resolvePendingDebugSend(false);
  };

  const handleConfirmDebugSend = async () => {
    if (!pendingDebugSend || !agentDebug) return;
    setSavingDebugDraft(true);
    try {
      const saved = await agentDebug.onSaveDraft();
      if (!saved) {
        resolvePendingDebugSend(false);
        return;
      }
      const sent = await sendImmediately(pendingDebugSend.text, pendingDebugSend.opts);
      resolvePendingDebugSend(sent);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      resolvePendingDebugSend(false);
    } finally {
      setSavingDebugDraft(false);
    }
  };

  const handleCollapsePanel = () => {
    setSessionBarOpen(false);
    setChatPanelCollapsed(true);
    if (!currentSessionId) {
      setChatPanelDraftOpen(false);
    }
  };

  const handleToggleSessionBar = () => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    setSessionBarOpen((open) => !open);
  };

  const handleCloseSessionBar = () => {
    setSessionBarOpen(false);
  };

  const handleSelectSession = (session: ChatSession) => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    void stop();
    clearResourceChatContext?.();
    setCurrentSession(session);
    clearNewChatSessionStore();
    setChatPanelDraftOpen(false);
    setSessionBarOpen(false);
    if (fullWidth) {
      navigate(buildChatPath(session.id), { replace: true });
    }
  };

  const handleNewChat = () => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    void stop();
    clearResourceChatContext?.();
    setSessionBarOpen(false);
    if (onNewChat) {
      onNewChat();
      return;
    }
    clearCurrentSession();
    clearNewChatSessionStore();
    setChatPanelDraftOpen(true);
  };

  /**
   * @wisepen-manual-effect
   * 执行时机：当前会话 ID 首次可用或发生切换时加载对应历史消息。
   * 不可替代原因：历史消息来自异步服务，并写入当前 Chat 运行时的消息状态。
   * cleanup：请求竞态由 useChatHistory 管理，本层没有额外订阅需要清理。
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
    if (useNewChatSessionStore.getState().newChatSessionId === currentSessionId) return;
    void historyActionsLatest.current.loadHistoryMessages(currentSessionId);
  }, [appAuth.isAuthenticated, currentSessionId, historyActionsLatest]);

  return {
    canLoadMoreHistory,
    currentModel,
    currentSessionId,
    handleCancelDebugSend,
    handleCollapsePanel,
    handleCloseSessionBar,
    handleConfirmDebugSend,
    handleNewChat,
    handleSelectSession,
    handleSend,
    handleToggleSessionBar,
    isAuthenticated: appAuth.isAuthenticated,
    isDebugSaveDialogOpen: pendingDebugSend != null,
    loadMoreHistoryMessages,
    loadingInitialHistory,
    loadingMoreHistory,
    messages,
    panelTitle,
    resourceChatContext,
    clearResourceChatContext,
    savingDebugDraft,
    sessionBarOpen,
    status,
    stop,
    requireLogin: appAuth.requireLogin,
    ensureChatSession,
  };
}

export type ChatPanelController = ReturnType<typeof useChatPanelController>;
