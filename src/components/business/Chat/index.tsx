import { Chat as AiChat, useChat } from '@ai-sdk/react';
import { toast } from '@heroui/react';
import { useLatest, useMemoizedFn, useUnmountedRef } from 'ahooks';
import { memo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ChatProps } from '@/components/business/Chat/index.type';
import type { ChatModel } from '@/domains/ChatConfig';
import {
  type ChatSession,
  type CreateSessionRequest,
  useChatSessionMetadata,
  type WisePenUIMessage,
} from '@/domains/ChatSession';
import { useFrontendStateValue } from '@/frontendState';
import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useAppAuth } from '@/layouts/App/_context';
import { useChatSessionHistoryRefreshStore } from '@/layouts/AppLayout/_store/useChatSessionHistoryRefreshStore';
import { captureException } from '@/observability';
import { buildSessionSendPayload, getChatRouter, useChatRouterSnapshot } from '@/runtime/chat';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';

import ChatConversation from './ChatConversation';
import ChatHeader from './ChatHeader';
import { useRefreshHistoryOnFirstContent } from './hooks/useRefreshHistoryOnFirstContent';
import { useSyncChatRouteForeground } from './hooks/useSyncChatRouteForeground';
import { listToolApprovalRequests } from './model/toolApprovalModel';
import type { SendOptions } from './send.type';
import styles from './style.module.scss';
import ToolApprovalDialog from './ToolApprovalDialog';

function Chat({
  fullWidth = 'panel',
  showHeader,
  resourceChat,
  resourceId,
  hostAgentPort,
  showCollapseButton = true,
  onCollapsePanel,
}: ChatProps) {
  const { t } = useTranslation(['chat', 'common']);
  const { isAuthenticated, requireLogin } = useAppAuth();
  const requestChatSessionHistoryRefresh = useChatSessionHistoryRefreshStore(
    (state) => state.requestRefresh
  );
  const { sessionId: currentSessionId, selectSession, locationKey } = useChatSessionRoute();
  const currentSession = useChatSessionMetadata(currentSessionId);
  const locationKeyLatest = useLatest(locationKey);
  const unmountedRef = useUnmountedRef();
  const selectedText = useFrontendStateValue('selected_text');

  const router = getChatRouter();
  const routerSnapshot = useChatRouterSnapshot();
  const [emptyChat] = useState(() => new AiChat<WisePenUIMessage>({ id: '__chat_router_empty__' }));
  const chat = routerSnapshot.chat ?? emptyChat;
  const { messages, status } = useChat({ chat });

  const [currentModel, setCurrentModel] = useState<ChatModel | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [sessionBarOpen, setSessionBarOpen] = useState(false);
  const [newChatSessionId, setNewChatSessionId] = useState<string>();
  const pendingHistoryRefreshRef = useRef<string | undefined>(undefined);
  const creatingSessionRef = useRef<{
    locationKey: string;
    promise: Promise<string | undefined>;
  } | null>(null);
  const [approvalDecisions, setApprovalDecisions] = useState<Record<string, boolean>>({});

  const focusing = useSyncChatRouteForeground(currentSessionId);
  useRefreshHistoryOnFirstContent(
    currentSessionId,
    messages,
    pendingHistoryRefreshRef,
    requestChatSessionHistoryRefresh
  );

  const resourceStateProvider = resourceChat?.provider;
  const resourceChatContext = resourceChat?.context;
  const clearResourceChatContext = resourceChat?.clearContext;

  const panelTitle =
    currentSession?.title || t(currentSessionId ? 'session.untitled' : 'panel.newChat');
  const promoteDraftToolSelection =
    currentSessionId !== undefined && currentSessionId === newChatSessionId;
  const runtime = routerSnapshot.runtime;
  const canLoadMoreHistory = runtime ? runtime.historyPage < runtime.historyTotalPage : false;
  const approvalRequests = listToolApprovalRequests(messages);
  const pendingToolApproval = currentSessionId
    ? approvalRequests.find((request) => approvalDecisions[request.toolCallId] === undefined)
    : undefined;
  const approvalSubmitting = status === 'submitted' || status === 'streaming';

  const requireAuth = (): boolean => {
    if (isAuthenticated) return true;
    requireLogin();
    return false;
  };

  /** 组件未卸载且仍停留在 startedLocationKey 对应路由。 */
  const isRouteLive = (startedLocationKey: string) =>
    !unmountedRef.current && locationKeyLatest.current === startedLocationKey;

  const resetLocalChatSurface = () => {
    clearResourceChatContext?.();
    setNewChatSessionId(undefined);
    pendingHistoryRefreshRef.current = undefined;
  };

  const bindCreatedSessionToRoute = useMemoizedFn(async (sessionId: string) => {
    if (!isRouteLive(locationKey)) return;
    setNewChatSessionId(sessionId);
    pendingHistoryRefreshRef.current = sessionId;
    await selectSession(sessionId, true);
    requestChatSessionHistoryRefresh();
  });

  /** 上传附件等入口：只要有可写 sessionId */
  const ensureSession = useMemoizedFn(async (): Promise<string | undefined> => {
    if (!isRouteLive(locationKey)) return;
    if (!requireAuth()) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: t('input.loginRequired'),
      });
    }
    if (currentSessionId) return currentSessionId;

    if (creatingSessionRef.current?.locationKey !== locationKey) {
      const promise = (async () => {
        await router.createSession();
        const createdSessionId = router.getSnapshot().sessionId;
        if (!createdSessionId) return;
        await bindCreatedSessionToRoute(createdSessionId);
        return createdSessionId;
      })();
      creatingSessionRef.current = { locationKey, promise };
      const clearPending = () => {
        if (creatingSessionRef.current?.promise === promise) creatingSessionRef.current = null;
      };
      void promise.then(clearPending, clearPending);
    }
    return creatingSessionRef.current.promise;
  });

  const send = async (text: string, opts?: SendOptions): Promise<boolean> => {
    const startedLocationKey = locationKey;
    if (!isRouteLive(startedLocationKey) || !requireAuth()) return false;

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
    let create: CreateSessionRequest | undefined;
    if (selectedAgent?.resourceId) {
      create = { agentId: selectedAgent.resourceId };
    } else if (selectedAgent?.isDefault || selectedAgent?.source === 'DEFAULT') {
      create = { agentId: null };
    }

    const payload = buildSessionSendPayload({
      resourceId,
      modelId: targetModel.modelId,
      providerId: targetModel.providerId,
      uploadedAttachments: opts?.activeAttachments,
      toolSelectionOverrides: opts?.toolSelectionOverrides,
      selectedSkillIds: opts?.selectedSkills?.map((skill) => skill.skillId),
      resourceOnDemandSkillIds: resourceStateProvider?.onDemandSkillIds,
    });
    if (!payload.ok) {
      toast.warning(t('panel.contextMismatch'));
      return false;
    }

    try {
      // 路由已有会话但前台尚未对齐时，先 focus；send 本身只打前台
      if (currentSessionId && router.getSnapshot().sessionId !== currentSessionId) {
        await router.focusSession(currentSessionId);
      }
      if (!isRouteLive(startedLocationKey)) return false;
      const hadForeground = Boolean(router.getSnapshot().sessionId);
      await router.send(text, {
        create,
        ...payload.options,
      });
      if (!isRouteLive(startedLocationKey)) return false;
      const sessionId = router.getSnapshot().sessionId;
      if (!hadForeground && sessionId) {
        await bindCreatedSessionToRoute(sessionId);
      }
    } catch (error) {
      captureException(error, {
        detector: 'application-handled',
        operation: 'chat.send',
      });
      toast.danger(parseErrorMessage(error));
      return false;
    }

    payload.finishSend();
    if (resourceChatContext) clearResourceChatContext?.(resourceChatContext);
    return true;
  };

  const handleSend = (text: string, opts?: SendOptions) => {
    const guarded = hostAgentPort?.interceptSend?.(text, opts);
    if (!guarded) return send(text, opts);
    const pendingLocationKey = locationKeyLatest.current;
    return guarded.then((accepted) => {
      if (!accepted || !isRouteLive(pendingLocationKey)) return false;
      return send(text, opts);
    });
  };

  const handleCancel = async () => {
    if (!currentSessionId || cancelling) return;
    setCancelling(true);
    try {
      await router.cancel();
    } catch (error) {
      toast.danger(t('input.cancelFailed', { error: parseErrorMessage(error) }));
    } finally {
      setCancelling(false);
    }
  };

  const handleLoadMoreHistory = async () => {
    if (!requireAuth()) return;
    try {
      await router.loadMoreHistory();
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  const handleApprovalDecision = (toolCallId: string, approved: boolean) => {
    if (!currentSessionId || approvalSubmitting) return;
    const pendingToolCallIds = approvalRequests.map((request) => request.toolCallId);
    if (!pendingToolCallIds.includes(toolCallId)) return;

    const nextDecisions = { ...approvalDecisions, [toolCallId]: approved };
    setApprovalDecisions(nextDecisions);
    if (pendingToolCallIds.some((pendingId) => nextDecisions[pendingId] === undefined)) return;

    void router
      .approve(
        pendingToolCallIds.map((pendingId) => ({
          toolCallId: pendingId,
          approved: nextDecisions[pendingId] ?? false,
        }))
      )
      .finally(() => {
        setApprovalDecisions((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([id]) => !pendingToolCallIds.includes(id))
          )
        );
      });
  };

  const toggleSessionBar = () => {
    if (!requireAuth()) return;
    setSessionBarOpen((open) => !open);
  };

  const closeSessionBar = () => setSessionBarOpen(false);

  const handleSelectSession = (session: ChatSession) => {
    if (!requireAuth()) return;
    if (session.id === currentSessionId) {
      setSessionBarOpen(false);
      return;
    }
    resetLocalChatSurface();
    setSessionBarOpen(false);
    void selectSession(session.id);
  };

  const startNewChat = () => {
    if (!requireAuth()) return;
    resetLocalChatSurface();
    setSessionBarOpen(false);
    void selectSession();
  };

  const handleCollapsePanel = () => {
    closeSessionBar();
    onCollapsePanel?.();
  };

  const isFullWidth = fullWidth === 'page';

  return (
    <>
      <div className={styles.panel} data-chat-layout={fullWidth}>
        {showHeader ? (
          <ChatHeader
            panelTitle={panelTitle}
            sessionBarOpen={sessionBarOpen}
            showCollapseButton={showCollapseButton}
            reserveTitleBarEnd={!isFullWidth}
            onCollapsePanel={handleCollapsePanel}
            onNewChat={startNewChat}
            onToggleSessionBar={toggleSessionBar}
          />
        ) : null}

        <ChatConversation
          injectedAgents={hostAgentPort?.injectedAgents}
          preferredAgent={hostAgentPort?.preferredAgent}
          contextPreview={resourceChat?.context ? selectedText : undefined}
          fullWidth={isFullWidth}
          messages={messages}
          status={status}
          isEmpty={messages.length === 0}
          currentModel={currentModel}
          cancelling={cancelling}
          currentSessionId={currentSessionId}
          sessionBarOpen={sessionBarOpen}
          promoteDraftToolSelection={promoteDraftToolSelection}
          canLoadMoreHistory={canLoadMoreHistory}
          loadingInitialHistory={focusing}
          loadingMoreHistory={runtime?.historyLoadingMore ?? false}
          onLoadMoreHistory={handleLoadMoreHistory}
          onCancel={handleCancel}
          onCloseSessionBar={closeSessionBar}
          onSelectSession={handleSelectSession}
          getUploadSessionId={() => ensureSession()}
          onClearContext={resourceChat?.clearContext}
          onSend={handleSend}
        />
      </div>
      {pendingToolApproval ? (
        <ToolApprovalDialog
          key={pendingToolApproval.toolCallId}
          name={pendingToolApproval.name}
          input={pendingToolApproval.input}
          submitting={approvalSubmitting}
          onDecision={(approved) =>
            handleApprovalDecision(pendingToolApproval.toolCallId, approved)
          }
        />
      ) : null}
    </>
  );
}

export default memo(Chat);
