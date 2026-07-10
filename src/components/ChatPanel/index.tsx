import type { ChatPanelProps, Message, Model } from '@/components/ChatPanel/index.type';
import { useChatService } from '@/domains';
import { useChatSession } from '@/domains/Chat/session/useChatSession';
import {
  clearNewChatSessionStore,
  useChatPanelStore,
  useCurrentChatSessionStore,
  useNewChatSessionStore,
  useNoteSelectionStore,
} from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useMount, useRequest, useUpdateEffect } from 'ahooks';
import { IndentIncrease } from 'lucide-react';
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
import MessageList from './MessageList';
import NewChatButton from './NewChatButton';
import styles from './style.module.less';

function ChatPanel({ collapsed, fullWidth = false, onNewChat, workspaceContext }: ChatPanelProps) {
  const navigate = useNavigate();
  const chatService = useChatService();
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const chatPanelDraftOpen = useChatPanelStore((state) => state.chatPanelDraftOpen);
  const setChatPanelDraftOpen = useChatPanelStore((state) => state.setChatPanelDraftOpen);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const currentSessionTitle = useCurrentChatSessionStore((state) => state.currentSessionTitle);
  const setCurrentSession = useCurrentChatSessionStore((state) => state.setCurrentSession);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const enableSelectedText = useNoteSelectionStore((state) =>
    currentSessionId ? Boolean(state.enableSelectedTextByResourceId[currentSessionId]) : false
  );
  const selectedContextText = useNoteSelectionStore((state) =>
    currentSessionId ? (state.selectedTextByResourceId[currentSessionId] ?? '') : ''
  );
  const selectedNoteScope = useNoteSelectionStore((state) =>
    currentSessionId ? state.selectedNoteScopeByResourceId[currentSessionId] : undefined
  );
  const clearSelectedText = useNoteSelectionStore((state) => state.clearSelectedText);

  const [currentModel, setCurrentModel] = useState<Model | null>(null);
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPage, setHistoryTotalPage] = useState(1);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);

  const {
    messages: liveMessages,
    status,
    setMessages: setLiveMessages,
    sendSessionMessage,
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
    clearNewChatSessionStore();
  }, [currentSessionId, hasRenderableChatContent]);

  const sending = status === 'submitted' || status === 'streaming';
  const hasSelectedContext = enableSelectedText && Boolean(selectedContextText.trim());
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
    if (
      workspaceContext?.editorType === 'note' &&
      workspaceContext.noteSyncStatus &&
      workspaceContext.noteSyncStatus !== 'connected'
    ) {
      toast.warning('笔记仍在同步或已断开连接，请连接成功后再让 AI 读取当前笔记');
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
      enableSelected: hasSelectedContext,
      selectedText: selectedContextText,
      selectedNoteScope,
      sessionId: targetSessionId,
      workspaceContext,
      selectedResources: opts?.activeDocRefs,
      uploadedAttachments: opts?.activeAttachments,
      onDemandSkillIds: opts?.selectedSkills?.map((skill) => skill.skillId),
      allowToolNames: opts?.selectedTools?.map((tool) => tool.toolId),
    });

    if (hasSelectedContext) {
      clearSelectedText(targetSessionId);
    }
    await sendPromise;
  };

  const handleClearSelectedContext = () => {
    if (!currentSessionId) return;
    clearSelectedText(currentSessionId);
  };

  const handleCollapsePanel = () => {
    setChatPanelCollapsed(true);
    if (!currentSessionId) {
      setChatPanelDraftOpen(false);
    }
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

  return (
    <div className={`${styles.panel} ${fullWidth ? styles.fullWidth : ''}`}>
      <div className={`${styles.header} ${collapsed ? styles.collapsedHeader : ''}`}>
        <div className={styles.headerLeft}>
          {!collapsed && !fullWidth && (
            <button
              type="button"
              onClick={handleCollapsePanel}
              className={styles.triggerBtn}
              aria-label="收起聊天面板"
            >
              <IndentIncrease size={18} />
            </button>
          )}
          {!collapsed && (
            <div className={styles.titleWrap}>
              <div className={styles.title}>{panelTitle}</div>
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          <div className={styles.content}>
            <div className={styles.contentTopBar}>
              <NewChatButton onClick={onNewChat} compact={!fullWidth} />
            </div>

            <div className={styles.messageViewport}>
              <MessageList
                messages={messages}
                canLoadMoreHistory={Boolean(currentSessionId) && historyPage < historyTotalPage}
                loadingMoreHistory={loadingMoreHistory}
                onLoadMoreHistory={loadMoreHistoryMessages}
              />
            </div>
          </div>

          <div className={styles.footer}>
            <ChatInput
              onSend={handleSend}
              getUploadSessionId={ensureChatSession}
              sending={sending}
              hasSelectedContext={hasSelectedContext}
              selectedContextText={selectedContextText}
              onClearSelectedContext={handleClearSelectedContext}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default memo(ChatPanel);
