import { useChatSessionHistoryRefreshStore } from '@/components/ChatPanel/_store/useChatSessionHistoryRefreshStore';
import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import {
  clearNewChatSessionStore,
  useNewChatSessionStore,
} from '@/components/ChatPanel/_store/useNewChatSessionStore';
import type { ChatPanelProps, Model } from '@/components/ChatPanel/index.type';
import { AppAlertDialog } from '@/components/Overlay';
import { useChatService } from '@/domains';
import { useChatHistory, type ChatSession } from '@/domains/Chat';
import type { CreateSessionRequest } from '@/domains/Chat/service/index.type';
import { useChatSession } from '@/domains/Chat/session/useChatSession';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useMount, useRequest, useUpdateEffect } from 'ahooks';
import { memo, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInput from './ChatInput';
import type { SendOptions } from './ChatInput/index.type';
import {
  HISTORY_PAGE_SIZE,
  hasRenderableMessageContent,
  isSessionInvalidMessage,
} from './ChatPanel';
import ChatPanelHeader from './ChatPanelHeader';
import ChatSessionBar from './ChatSessionBar';
import MessageList from './MessageList';
import { useChatPanelStore } from './_store/useChatPanelStore';
import styles from './style.module.less';

function ChatPanel({
  collapsed,
  fullWidth = false,
  showHeader = true,
  onNewChat,
  resourceChat,
  agentDebug,
  showCollapseButton = true,
}: ChatPanelProps) {
  const navigate = useNavigate();
  const chatService = useChatService();
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const chatPanelDraftOpen = useChatPanelStore((state) => state.chatPanelDraftOpen);
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

  const [currentModel, setCurrentModel] = useState<Model | null>(null);
  const [sessionBarOpen, setSessionBarOpen] = useState(false);
  const [pendingDebugSend, setPendingDebugSend] = useState<{
    text: string;
    opts?: SendOptions;
    resolve: (sent: boolean) => void;
  } | null>(null);
  const [savingDebugDraft, setSavingDebugDraft] = useState(false);

  const { messages, status, setMessages, sendSessionMessage, stop } = useChatSession({
    sessionId: currentSessionId ?? '',
    model: currentModel?.modelId,
  });

  const { runAsync: runLoadSessionHistory } = useRequest(
    async (sessionId: string, page: number, size: number) =>
      chatService.listHistoryMessages({ sessionId, page, size }),
    { manual: true }
  );
  const loadHistoryPage = useCallback(
    (sessionId: string, page: number, size: number) => runLoadSessionHistory(sessionId, page, size),
    [runLoadSessionHistory]
  );
  const {
    canLoadMore: canLoadMoreHistory,
    loadingMore: loadingMoreHistory,
    replaceHistory,
    prependHistory,
    clearConversation,
  } = useChatHistory({
    sessionId: currentSessionId ?? null,
    pageSize: HISTORY_PAGE_SIZE,
    loadPage: loadHistoryPage,
    setMessages,
  });
  const { runAsync: runCreateSession } = useRequest(
    (params?: CreateSessionRequest) => chatService.createSession(params),
    {
      manual: true,
    }
  );
  const { runAsync: runSetSessionAgent } = useRequest(
    (params: { sessionId: string; agentId?: string | null; agentVersion?: number | null }) =>
      chatService.setSessionAgent(params),
    {
      manual: true,
    }
  );
  const hasRenderableChatContent = useMemo(() => hasRenderableMessageContent(messages), [messages]);

  useUpdateEffect(() => {
    if (currentSessionId == null || currentSessionId === '') return;
    const pendingId = useNewChatSessionStore.getState().newChatSessionId;
    if (pendingId !== currentSessionId) return;
    if (!hasRenderableChatContent) return;
    requestChatSessionHistoryRefresh();
    clearNewChatSessionStore();
  }, [currentSessionId, hasRenderableChatContent, requestChatSessionHistoryRefresh]);

  const sending = status === 'submitted' || status === 'streaming';
  const hasResourceChatContext = Boolean(resourceChatContext);
  const panelTitle = currentSessionTitle || '新对话';

  const resolveSessionAgentParams = (opts?: SendOptions): CreateSessionRequest | undefined => {
    const selectedAgent = opts?.selectedAgent;
    if (!selectedAgent) return undefined;
    if (!selectedAgent.resourceId) {
      if (selectedAgent.isDefault || selectedAgent.source === 'DEFAULT') {
        return { agentId: null, agentVersion: null };
      }
      return undefined;
    }
    return {
      agentId: selectedAgent.resourceId,
      agentVersion: selectedAgent.agentVersion,
    };
  };

  const isCurrentSessionAgentMatched = (agentParams?: CreateSessionRequest): boolean => {
    if (!agentParams) return true;
    if (agentParams.agentId == null) return currentSessionAgentId == null;
    return (
      currentSessionAgentId === agentParams.agentId &&
      (agentParams.agentVersion == null || currentSessionAgentVersion === agentParams.agentVersion)
    );
  };

  const ensureChatSession = async (agentParams?: CreateSessionRequest): Promise<string> => {
    const existingSessionId =
      useCurrentChatSessionStore.getState().currentSessionId ?? currentSessionId;
    if (existingSessionId) {
      if (!isCurrentSessionAgentMatched(agentParams)) {
        const updatedSession = await runSetSessionAgent({
          sessionId: existingSessionId,
          agentId: agentParams?.agentId,
          agentVersion: agentParams?.agentVersion,
        });
        setCurrentSession({
          id: updatedSession.id,
          title: updatedSession.title,
          agentId: updatedSession.agentId,
          agentVersion: updatedSession.agentVersion,
        });
      }
      return existingSessionId;
    }

    const createdSession = await runCreateSession(agentParams);
    useNewChatSessionStore.getState().setNewChatSession({
      id: createdSession.id,
      title: createdSession.title,
    });
    setCurrentSession({
      id: createdSession.id,
      title: createdSession.title,
      agentId: createdSession.agentId,
      agentVersion: createdSession.agentVersion,
    });
    requestChatSessionHistoryRefresh();
    setChatPanelDraftOpen(false);
    if (fullWidth) {
      navigate(`/app/chat/${createdSession.id}`, { replace: true });
    }
    return createdSession.id;
  };

  const loadHistoryMessages = async (sessionId: string) => {
    try {
      await replaceHistory(sessionId);
    } catch (error) {
      const errorMessage = parseErrorMessage(error);
      if (isSessionInvalidMessage(errorMessage)) {
        clearResourceChatContext?.();
        clearCurrentSession();
        clearConversation();
        return;
      }
      toast.danger(errorMessage);
      clearConversation();
    }
  };

  const loadMoreHistoryMessages = async () => {
    try {
      await prependHistory();
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  const sendImmediately = async (text: string, opts?: SendOptions): Promise<boolean> => {
    const targetModel = opts?.model ?? currentModel;
    if (!targetModel) return false;
    const sendBlockedReason = resourceStateProvider?.getBlockedReason?.();
    if (sendBlockedReason) {
      toast.warning(sendBlockedReason);
      return false;
    }
    if (resourceChatContext && resourceChatContext.providerKey !== resourceStateProvider?.key) {
      toast.warning('所选上下文属于其他资源，请移除后在当前资源中重新选择');
      return false;
    }
    setCurrentModel(targetModel);
    let targetSessionId = currentSessionId;
    const agentParams = resolveSessionAgentParams(opts);

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
    }).catch((error) => {
      toast.danger(parseErrorMessage(error));
    });

    if (hasResourceChatContext) {
      clearResourceChatContext?.(resourceChatContext);
    }
    return true;
  };

  const isCurrentDebugAgentSelected = (opts?: SendOptions): boolean => {
    if (!agentDebug) return false;
    return opts?.selectedAgent?.agentId === agentDebug.agent.agentId;
  };

  const handleSend = async (text: string, opts?: SendOptions): Promise<boolean> => {
    if (agentDebug?.isDirty && isCurrentDebugAgentSelected(opts)) {
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

  const handleClearContext = () => {
    clearResourceChatContext?.();
  };

  const handleCollapsePanel = () => {
    setSessionBarOpen(false);
    setChatPanelCollapsed(true);
    if (!currentSessionId) {
      setChatPanelDraftOpen(false);
    }
  };

  const handleToggleSessionBar = () => {
    if (collapsed) return;
    setSessionBarOpen((open) => !open);
  };

  const handleCloseSessionBar = () => {
    setSessionBarOpen(false);
  };

  const handleSelectSession = (session: ChatSession) => {
    void stop();
    clearResourceChatContext?.();
    setCurrentSession({
      id: session.id,
      title: session.title,
      agentId: session.agentId,
      agentVersion: session.agentVersion,
    });
    clearNewChatSessionStore();
    setChatPanelDraftOpen(false);
    setSessionBarOpen(false);
    if (fullWidth) {
      navigate(`/app/chat/${session.id}`, { replace: true });
    }
  };

  const handleNewChat = () => {
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

  useMount(() => {
    if (!currentSessionId) return;
    void loadHistoryMessages(currentSessionId);
  });

  useUpdateEffect(() => {
    if (!currentSessionId) {
      clearConversation();
      return;
    }
    if (useNewChatSessionStore.getState().newChatSessionId === currentSessionId) return;
    void loadHistoryMessages(currentSessionId);
  }, [currentSessionId]);

  useUpdateEffect(() => {
    if (currentSessionId) return;
    if (!chatPanelDraftOpen) {
      clearConversation();
    }
  }, [chatPanelDraftOpen, clearConversation, currentSessionId]);

  useUpdateEffect(() => {
    if (!collapsed) return;
    setSessionBarOpen(false);
  }, [collapsed]);

  return (
    <>
      <div className={`${styles.panel} ${fullWidth ? styles.fullWidth : ''}`}>
        {showHeader ? (
          <ChatPanelHeader
            collapsed={collapsed}
            fullWidth={fullWidth}
            panelTitle={panelTitle}
            sessionBarOpen={sessionBarOpen}
            showCollapseButton={showCollapseButton}
            onCollapsePanel={handleCollapsePanel}
            onNewChat={handleNewChat}
            onToggleSessionBar={handleToggleSessionBar}
          />
        ) : null}

        {!collapsed && (
          <div className={styles.panelBody}>
            {sessionBarOpen ? (
              <ChatSessionBar
                activeSessionId={currentSessionId}
                onClose={handleCloseSessionBar}
                onSelectSession={handleSelectSession}
              />
            ) : (
              <div className={styles.conversationPanel}>
                <div className={styles.content}>
                  <div className={styles.messageViewport}>
                    <MessageList
                      messages={messages}
                      sessionId={currentSessionId}
                      canLoadMoreHistory={canLoadMoreHistory}
                      loadingMoreHistory={loadingMoreHistory}
                      onLoadMoreHistory={loadMoreHistoryMessages}
                      status={status}
                      model={currentModel}
                      fullWidth={fullWidth}
                      footer={
                        <div className={styles.footer}>
                          <ChatInput
                            onSend={handleSend}
                            getUploadSessionId={ensureChatSession}
                            sending={sending}
                            onStop={stop}
                            contextPreview={resourceChatContext?.preview}
                            onClearContext={handleClearContext}
                            injectedAgents={agentDebug ? [agentDebug.agent] : undefined}
                            preferredAgent={agentDebug?.agent}
                            fullWidth={fullWidth}
                          />
                        </div>
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <AppAlertDialog
        type="warning"
        isOpen={pendingDebugSend != null}
        onOpenChange={(open) => {
          if (!open) handleCancelDebugSend();
        }}
        title="保存后再调试？"
        description="当前 Agent 配置有未保存修改。调试会使用已保存的草稿版本；如需测试当前改动，请先保存。"
        cancelText="取消"
        confirmText="保存并发送"
        isConfirmLoading={savingDebugDraft || agentDebug?.isSaving}
        onConfirm={() => void handleConfirmDebugSend()}
      />
    </>
  );
}

export default memo(ChatPanel);
