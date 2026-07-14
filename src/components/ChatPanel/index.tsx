import { useChatSessionHistoryRefreshStore } from '@/components/ChatPanel/_store/useChatSessionHistoryRefreshStore';
import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import {
  clearNewChatSessionStore,
  useNewChatSessionStore,
} from '@/components/ChatPanel/_store/useNewChatSessionStore';
import type { ChatPanelProps, Message, Model } from '@/components/ChatPanel/index.type';
import { useChatService } from '@/domains';
import type { ChatSession } from '@/domains/Chat';
import { useChatSession } from '@/domains/Chat/session/useChatSession';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useMount, useRequest, useUpdateEffect } from 'ahooks';
import { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInput from './ChatInput';
import type { SendOptions } from './ChatInput/index.type';
import {
  HISTORY_PAGE_SIZE,
  buildPanelMessages,
  hasMessagesPlainText,
  isSessionInvalidMessage,
  mapHistoryMessage,
  type ModelMeta,
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
  const setCurrentSession = useCurrentChatSessionStore((state) => state.setCurrentSession);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const resourceStateProvider = resourceChat?.provider;
  const resourceChatContext = resourceChat?.context;
  const clearResourceChatContext = resourceChat?.clearContext;

  const [currentModel, setCurrentModel] = useState<Model | null>(null);
  const [sessionBarOpen, setSessionBarOpen] = useState(false);
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPage, setHistoryTotalPage] = useState(1);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);

  const {
    messages: liveMessages,
    status,
    setMessages: setLiveMessages,
    sendSessionMessage,
    stop,
  } = useChatSession({
    sessionId: currentSessionId ?? '',
    model: currentModel?.modelId,
  });

  const { runAsync: runLoadSessionHistory } = useRequest(
    async (sessionId: string, page = 1) =>
      chatService.listHistoryMessages({ sessionId, page, size: HISTORY_PAGE_SIZE }),
    { manual: true }
  );
  const { runAsync: runCreateSession } = useRequest(() => chatService.createSession(), {
    manual: true,
  });
  const { data: models = [] } = useRequest(() => chatService.getModels());

  const modelMetaMap = useMemo<Record<string, ModelMeta>>(() => {
    return models.reduce<Record<string, ModelMeta>>((acc, model) => {
      acc[model.id] = { provider: model.provider, name: model.name };
      if (!acc[model.modelId]) {
        acc[model.modelId] = { provider: model.provider, name: model.name };
      }
      return acc;
    }, {});
  }, [models]);

  useUpdateEffect(() => {
    if (Object.keys(modelMetaMap).length === 0) return;
    setHistoryMessages((previousMessages) =>
      previousMessages.map((message) => {
        if (message.role !== 'ai') return message;
        const modelId = message.meta?.modelId;
        if (!modelId) return message;
        const modelMeta = modelMetaMap[modelId];
        if (!modelMeta) return message;
        if (
          message.meta?.modelName === modelMeta.name &&
          message.meta?.provider === modelMeta.provider
        ) {
          return message;
        }
        return {
          ...message,
          meta: { ...message.meta, modelName: modelMeta.name, provider: modelMeta.provider },
        };
      })
    );
  }, [modelMetaMap]);

  const messages = useMemo(
    () => buildPanelMessages(historyMessages, liveMessages, currentModel, status),
    [currentModel, historyMessages, liveMessages, status]
  );
  const hasRenderableChatContent = useMemo(() => hasMessagesPlainText(messages), [messages]);

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

  const ensureChatSession = async (): Promise<string> => {
    const existingSessionId =
      useCurrentChatSessionStore.getState().currentSessionId ?? currentSessionId;
    if (existingSessionId) return existingSessionId;

    const createdSession = await runCreateSession();
    useNewChatSessionStore.getState().setNewChatSession({
      id: createdSession.id,
      title: createdSession.title,
    });
    setCurrentSession({ id: createdSession.id, title: createdSession.title });
    requestChatSessionHistoryRefresh();
    setChatPanelDraftOpen(false);
    if (fullWidth) {
      navigate(`/app/chat/${createdSession.id}`, { replace: true });
    }
    return createdSession.id;
  };

  const loadHistoryMessages = async (sessionId: string) => {
    try {
      const payload = await runLoadSessionHistory(sessionId, 1);
      setHistoryMessages(
        payload.list.map((m) => mapHistoryMessage(m, { modelMetaMap, currentModel }))
      );
      setHistoryPage(payload.page ?? 1);
      setHistoryTotalPage(payload.totalPage ?? 1);
    } catch (error) {
      const errorMessage = parseErrorMessage(error);
      if (isSessionInvalidMessage(errorMessage)) {
        clearResourceChatContext?.();
        clearCurrentSession();
        setHistoryMessages([]);
        setHistoryPage(1);
        setHistoryTotalPage(1);
        setLiveMessages([]);
        return;
      }
      toast.danger(errorMessage);
      setHistoryMessages([]);
      setHistoryPage(1);
      setHistoryTotalPage(1);
    }
  };

  const loadMoreHistoryMessages = async () => {
    if (!currentSessionId || loadingMoreHistory || historyPage >= historyTotalPage) return;

    const nextPage = historyPage + 1;
    setLoadingMoreHistory(true);

    try {
      const payload = await runLoadSessionHistory(currentSessionId, nextPage);
      const olderMessages = payload.list.map((m) =>
        mapHistoryMessage(m, { modelMetaMap, currentModel })
      );
      setHistoryMessages((previousMessages) => [...olderMessages, ...previousMessages]);
      setHistoryPage(payload.page ?? nextPage);
      setHistoryTotalPage(payload.totalPage ?? historyTotalPage);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    } finally {
      setLoadingMoreHistory(false);
    }
  };

  const handleSend = async (text: string, opts?: SendOptions) => {
    const targetModel = opts?.model ?? currentModel;
    if (!targetModel) return;
    const sendBlockedReason = resourceStateProvider?.getBlockedReason?.();
    if (sendBlockedReason) {
      toast.warning(sendBlockedReason);
      return;
    }
    if (resourceChatContext && resourceChatContext.providerKey !== resourceStateProvider?.key) {
      toast.warning('所选上下文属于其他资源，请移除后在当前资源中重新选择');
      return;
    }
    setCurrentModel(targetModel);
    let targetSessionId = currentSessionId;

    if (!targetSessionId) {
      try {
        targetSessionId = await ensureChatSession();
      } catch (error) {
        toast.danger(parseErrorMessage(error));
        return;
      }
    }

    const sendPromise = sendSessionMessage(text, {
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
    });

    await sendPromise;
    if (hasResourceChatContext) {
      clearResourceChatContext?.(resourceChatContext);
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
    clearResourceChatContext?.();
    setCurrentSession({ id: session.id, title: session.title });
    clearNewChatSessionStore();
    setChatPanelDraftOpen(false);
    setSessionBarOpen(false);
    if (fullWidth) {
      navigate(`/app/chat/${session.id}`, { replace: true });
    }
  };

  const handleNewChat = () => {
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
    setHistoryMessages([]);
    setHistoryPage(1);
    setHistoryTotalPage(1);
    setLiveMessages([]);
    void loadHistoryMessages(currentSessionId);
  });

  useUpdateEffect(() => {
    if (!currentSessionId) {
      setHistoryMessages([]);
      setHistoryPage(1);
      setHistoryTotalPage(1);
      setLiveMessages([]);
      return;
    }
    setHistoryMessages([]);
    setHistoryPage(1);
    setHistoryTotalPage(1);
    setLiveMessages([]);
    void loadHistoryMessages(currentSessionId);
  }, [currentSessionId]);

  useUpdateEffect(() => {
    if (currentSessionId) return;
    if (!chatPanelDraftOpen) {
      setHistoryMessages([]);
      setHistoryPage(1);
      setHistoryTotalPage(1);
      setLiveMessages([]);
    }
  }, [chatPanelDraftOpen, currentSessionId, setLiveMessages]);

  useUpdateEffect(() => {
    if (!collapsed) return;
    setSessionBarOpen(false);
  }, [collapsed]);

  return (
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
                    canLoadMoreHistory={Boolean(currentSessionId) && historyPage < historyTotalPage}
                    loadingMoreHistory={loadingMoreHistory}
                    onLoadMoreHistory={loadMoreHistoryMessages}
                    footer={
                      <div className={styles.footer}>
                        <ChatInput
                          onSend={handleSend}
                          getUploadSessionId={ensureChatSession}
                          sending={sending}
                          onStop={stop}
                          contextPreview={resourceChatContext?.preview}
                          onClearContext={handleClearContext}
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
  );
}

export default memo(ChatPanel);
