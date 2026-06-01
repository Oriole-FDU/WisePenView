import type { ChatPanelProps, Message, Model } from '@/components/ChatPanel/index.type';
import type { SkillSummary } from '@/domains';
import { useChatService, useGroupService, useResourceService } from '@/domains';
import { mapApiModelsToFlatModels } from '@/domains/Chat';
import { useAppMessage } from '@/hooks/useAppMessage';
import { useChatSession } from '@/domains/Chat/session/useChatSession';
import {
  clearChatPageStore,
  clearNewChatSessionStore,
  useAdvancedModeStore,
  useChatAgentStore,
  useChatCapabilityStore,
  useChatPanelStore,
  useCurrentChatSessionStore,
  useNewChatSessionStore,
  useNoteSelectionStore,
} from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { useMount, useRequest, useUpdateEffect } from 'ahooks';
import { useCallback, useMemo, useState } from 'react';
import { RiIndentIncrease } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import AdvancedModeToggle from './AdvancedModeToggle';
import { buildDefaultPersonalAgent, buildGroupAgent } from './agent';
import AgentSelector from './AgentSelector';
import ChatInput from './ChatInput';
import {
  HISTORY_PAGE_SIZE,
  buildPanelMessages,
  collectMessagesPlainText,
  isSessionInvalidMessage,
  mapHistoryMessage,
  type ModelMeta,
} from './ChatPanel';
import MessageList from './MessageList';
import NewChatButton from './NewChatButton';
import {
  buildAdvancedSkillTreeGroups,
  getAllowedSkillsForChat,
  getPrimarySkillsForAgent,
} from './skillScope';
import styles from './style.module.less';

function ChatPanel({ collapsed, fullWidth = false, onNewChat }: ChatPanelProps) {
  const navigate = useNavigate();
  const chatService = useChatService();
  const groupService = useGroupService();
  const resourceService = useResourceService();
  const messageApi = useAppMessage();
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
  const clearSelectedText = useNoteSelectionStore((state) => state.clearSelectedText);
  const draftAgent = useChatAgentStore((state) => state.draftAgent);
  const sessionAgentBySessionId = useChatAgentStore((state) => state.sessionAgentBySessionId);
  const setDraftAgent = useChatAgentStore((state) => state.setDraftAgent);
  const setSessionAgent = useChatAgentStore((state) => state.setSessionAgent);
  const advancedMode = useAdvancedModeStore((state) => state.advancedMode);
  const selectedSkills = useChatCapabilityStore((state) => state.selectedSkills);
  const [currentModel, setCurrentModel] = useState<Model | null>(null);
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPage, setHistoryTotalPage] = useState(1);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);

  const defaultPersonalAgent = useMemo(() => buildDefaultPersonalAgent(), []);
  const { data: joinedGroupData } = useRequest(
    () => groupService.fetchGroupList({ groupRoleFilter: 'JOINED', page: 1, size: 100 }),
    {
      refreshDeps: [],
    }
  );
  const { data: skillListData } = useRequest(
    async () => {
      const groups = joinedGroupData?.groups ?? [];
      const requests = [
        resourceService.getUserResources({
          page: 1,
          size: 200,
          sortBy: 'NAME' as const,
          sortDir: 'ASC' as const,
          resourceType: 'SKILL',
        }),
        ...groups.map((group) =>
          resourceService.getGroupResources({
            groupId: group.groupId,
            page: 1,
            size: 200,
            sortBy: 'NAME' as const,
            sortDir: 'ASC' as const,
            resourceType: 'SKILL',
          })
        ),
      ];
      const results = await Promise.all(requests);
      const skills: SkillSummary[] = [];
      const [personalResult, ...groupResults] = results;
      personalResult.list.forEach((item) => {
        skills.push({
          skillId: item.resourceId,
          displayName: item.resourceName,
          description: '',
          status: 'ACTIVE',
          scopeType: 'PERSONAL',
        });
      });
      groups.forEach((group, i) => {
        groupResults[i]?.list.forEach((item) => {
          skills.push({
            skillId: item.resourceId,
            displayName: item.resourceName,
            description: '',
            status: 'ACTIVE',
            scopeType: 'GROUP',
            groupId: group.groupId,
            groupName: group.groupName,
          });
        });
      });
      return { list: skills, total: skills.length, page: 1, size: skills.length, total_page: 1 };
    },
    { refreshDeps: [joinedGroupData] }
  );

  const groupOptions = useMemo(
    () => (joinedGroupData?.groups ?? []).map((group) => buildGroupAgent(group)),
    [joinedGroupData?.groups]
  );
  const agentOptions = useMemo(
    () => [defaultPersonalAgent, ...groupOptions],
    [defaultPersonalAgent, groupOptions]
  );
  const selectedAgent = useMemo(() => {
    if (currentSessionId) {
      return sessionAgentBySessionId[currentSessionId] ?? defaultPersonalAgent;
    }
    return draftAgent ?? defaultPersonalAgent;
  }, [currentSessionId, defaultPersonalAgent, draftAgent, sessionAgentBySessionId]);

  const allSkills = useMemo(() => skillListData?.list ?? [], [skillListData?.list]);
  const primarySkills = useMemo(
    () => getPrimarySkillsForAgent(allSkills, selectedAgent),
    [allSkills, selectedAgent]
  );
  const allowedSkills = useMemo(
    () => getAllowedSkillsForChat(allSkills, selectedAgent, advancedMode),
    [advancedMode, allSkills, selectedAgent]
  );
  const advancedSkillGroups = useMemo(
    () =>
      buildAdvancedSkillTreeGroups(
        allSkills,
        joinedGroupData?.groups ?? [],
        selectedAgent,
        primarySkills
      ),
    [allSkills, joinedGroupData?.groups, primarySkills, selectedAgent]
  );
  const allowedSkillIds = useMemo(
    () => allowedSkills.map((skill) => skill.skillId),
    [allowedSkills]
  );
  const allowedSkillIdsKey = useMemo(() => allowedSkillIds.join('|'), [allowedSkillIds]);

  const {
    messages: liveMessages,
    status,
    setMessages: setLiveMessages,
    sendSessionMessage,
  } = useChatSession({
    sessionId: currentSessionId ?? '',
    model: currentModel?.id,
  });

  const { runAsync: runLoadSessionHistory } = useRequest(
    async (sessionId: string, page = 1) =>
      chatService.listHistoryMessages({
        sessionId,
        page,
        size: HISTORY_PAGE_SIZE,
      }),
    {
      manual: true,
    }
  );
  const { runAsync: runCreateSession } = useRequest(() => chatService.createSession(), {
    manual: true,
  });
  const { data: modelListData } = useRequest(() => chatService.getModels());

  const modelMetaMap = useMemo<Record<string, ModelMeta>>(() => {
    const models = mapApiModelsToFlatModels(modelListData);
    return models.reduce<Record<string, ModelMeta>>((acc, model) => {
      acc[model.id] = {
        provider: model.provider,
        name: model.name,
      };
      return acc;
    }, {});
  }, [modelListData]);

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
          meta: {
            ...message.meta,
            modelName: modelMeta.name,
            provider: modelMeta.provider,
          },
        };
      })
    );
  }, [modelMetaMap]);

  const messages = buildPanelMessages(historyMessages, liveMessages, currentModel, status);
  const hasRenderableChatContent = collectMessagesPlainText(messages).trim().length > 0;

  useUpdateEffect(() => {
    if (currentSessionId == null || currentSessionId === '') return;
    const pendingId = useNewChatSessionStore.getState().newChatSessionId;
    if (pendingId !== currentSessionId) return;
    if (!hasRenderableChatContent) return;
    clearNewChatSessionStore();
  }, [currentSessionId, hasRenderableChatContent]);

  const sending = status === 'submitted' || status === 'streaming';
  const chatInputModelId = currentModel?.id ?? '';
  const hasSelectedContext = enableSelectedText && Boolean(selectedContextText.trim());
  const panelTitle = currentSessionTitle || '新对话';

  const loadHistoryMessages = useCallback(
    async (sessionId: string) => {
      try {
        const payload = await runLoadSessionHistory(sessionId, 1);
        setHistoryMessages(
          payload.list.map((m) => mapHistoryMessage(m, { modelMetaMap, currentModel }))
        );
        setHistoryPage(payload.page ?? 1);
        setHistoryTotalPage(payload.total_page ?? 1);
      } catch (error) {
        const errorMessage = parseErrorMessage(error, '拉取历史消息失败');
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
    },
    [clearCurrentSession, currentModel, modelMetaMap, runLoadSessionHistory, setLiveMessages]
  );

  const loadMoreHistoryMessages = useCallback(async () => {
    if (!currentSessionId) return;
    if (loadingMoreHistory) return;
    if (historyPage >= historyTotalPage) return;

    const nextPage = historyPage + 1;
    setLoadingMoreHistory(true);

    try {
      const payload = await runLoadSessionHistory(currentSessionId, nextPage);
      const olderMessages = payload.list.map((m) =>
        mapHistoryMessage(m, { modelMetaMap, currentModel })
      );
      setHistoryMessages((previousMessages) => [...olderMessages, ...previousMessages]);
      setHistoryPage(payload.page ?? nextPage);
      setHistoryTotalPage(payload.total_page ?? historyTotalPage);
    } catch (error) {
      messageApi.error(parseErrorMessage(error, '加载更多历史消息失败'));
    } finally {
      setLoadingMoreHistory(false);
    }
  }, [
    currentModel,
    currentSessionId,
    historyPage,
    historyTotalPage,
    loadingMoreHistory,
    modelMetaMap,
    runLoadSessionHistory,
  ]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!currentModel) return;
      let targetSessionId = currentSessionId;
      const targetAgent = selectedAgent ?? defaultPersonalAgent;

      if (!targetSessionId) {
        try {
          const createdSession = await runCreateSession();
          targetSessionId = createdSession.id;
          useNewChatSessionStore.getState().setNewChatSession({
            id: createdSession.id,
            title: createdSession.title,
          });
          setCurrentSession({ id: createdSession.id, title: createdSession.title });
          setSessionAgent(createdSession.id, targetAgent);
          setChatPanelDraftOpen(false);
          if (fullWidth) {
            navigate(`/app/chat/${createdSession.id}`, { replace: true });
          }
        } catch (error) {
          messageApi.error(parseErrorMessage(error, '新建聊天失败'));
          return;
        }
      }

      const selectedSkillIds = selectedSkills.map((s) => s.skillId);

      const sendPromise = sendSessionMessage(text, {
        model: currentModel.id,
        enableSelected: hasSelectedContext,
        sessionId: targetSessionId,
        agentContext: {
          agent_id: targetAgent.agentId,
          agent_type: targetAgent.agentType,
          group_id: targetAgent.groupId,
          advanced_mode_enabled: advancedMode,
        },
        allowedSkillIds,
        selectedSkillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
      });

      if (hasSelectedContext) {
        clearSelectedText(targetSessionId);
      }
      await sendPromise;
    },
    [
      advancedMode,
      allowedSkillIds,
      clearSelectedText,
      currentModel,
      currentSessionId,
      defaultPersonalAgent,
      fullWidth,
      hasSelectedContext,
      messageApi,
      navigate,
      runCreateSession,
      selectedAgent,
      selectedSkills,
      sendSessionMessage,
      setChatPanelDraftOpen,
      setCurrentSession,
      setSessionAgent,
    ]
  );

  const handleAgentChange = useCallback(
    (nextAgent: (typeof agentOptions)[number]) => {
      if (currentSessionId) {
        setSessionAgent(currentSessionId, nextAgent);
        return;
      }
      setDraftAgent(nextAgent);
    },
    [currentSessionId, setDraftAgent, setSessionAgent]
  );

  const handleClearSelectedContext = useCallback(() => {
    if (!currentSessionId) return;
    clearSelectedText(currentSessionId);
  }, [clearSelectedText, currentSessionId]);

  const handleCollapsePanel = useCallback(() => {
    setChatPanelCollapsed(true);
    if (!currentSessionId) {
      setChatPanelDraftOpen(false);
    }
  }, [currentSessionId, setChatPanelCollapsed, setChatPanelDraftOpen]);

  useMount(() => {
    if (!currentSessionId) return;
    setHistoryMessages([]);
    setHistoryPage(1);
    setHistoryTotalPage(1);
    setLiveMessages([]);
    void loadHistoryMessages(currentSessionId);
  });

  useUpdateEffect(() => {
    clearChatPageStore();
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
  }, [currentSessionId, loadHistoryMessages, setLiveMessages]);

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
              <RiIndentIncrease size={18} />
            </button>
          )}
          {!collapsed && (
            <div className={styles.titleWrap}>
              <div className={styles.title}>{panelTitle}</div>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className={styles.headerRight}>
            <AdvancedModeToggle compact={!fullWidth} />
            <div className={styles.agentSelectorShell}>
              <AgentSelector
                compact={!fullWidth}
                options={agentOptions}
                value={selectedAgent}
                onChange={handleAgentChange}
              />
            </div>
          </div>
        )}
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
              currentModelId={chatInputModelId}
              onModelChange={setCurrentModel}
              onSend={handleSend}
              sending={sending}
              hasSelectedContext={hasSelectedContext}
              selectedContextText={selectedContextText}
              onClearSelectedContext={handleClearSelectedContext}
              selectedAgent={selectedAgent}
              allSkills={allSkills}
              primarySkills={primarySkills}
              advancedMode={advancedMode}
              advancedSkillGroups={advancedSkillGroups}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default ChatPanel;
