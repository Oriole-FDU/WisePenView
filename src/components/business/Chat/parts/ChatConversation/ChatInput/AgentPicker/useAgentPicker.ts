import { useInfiniteScroll, useLatest } from 'ahooks';
import type { Key } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useChatConfigService } from '@/domains';
import type { PageResult } from '@/domains/_shared/entity/page';
import { buildDefaultPersonalAgent, type ChatAgentOption } from '@/domains/ChatConfig';

import { useChatInputStore, useChatInputStoreApi } from '../_context';
import type { AgentPickerProps } from './index.type';

const AGENT_PAGE_SIZE = 30;
export const LOAD_MORE_PERSONAL_ACTION = 'agent-action:load-more-personal';
export const SELECT_FROM_GROUP_ACTION = 'agent-action:select-from-group';

interface AgentPageState extends PageResult<ChatAgentOption> {
  list: ChatAgentOption[];
}

function mergeAgentOptions(
  agents: ChatAgentOption[],
  injectedAgents: ChatAgentOption[] = []
): ChatAgentOption[] {
  const seen = new Set<string>();
  return [...injectedAgents, ...agents].filter((agent) => {
    if (seen.has(agent.agentId)) return false;
    seen.add(agent.agentId);
    return true;
  });
}

export function useAgentPicker({ injectedAgents, preferredAgent }: AgentPickerProps) {
  const { t } = useTranslation('chat');
  const chatConfigService = useChatConfigService();
  const store = useChatInputStoreApi();
  const selectedAgent = useChatInputStore((state) => state.selectedAgent);
  const agentOpen = useChatInputStore((state) => state.agentOpen);
  const { setAgentOpen, setSelectedAgent } = store.getState();
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const {
    data: personalPage,
    loading: loadingPersonal,
    loadingMore: loadingMorePersonal,
    noMore: noMorePersonal,
    loadMore: loadMorePersonal,
  } = useInfiniteScroll<AgentPageState>(
    async (current) =>
      chatConfigService.listChatInputAgents({
        scope: 'PERSONAL',
        page: Math.floor((current?.list.length ?? 0) / AGENT_PAGE_SIZE) + 1,
        size: AGENT_PAGE_SIZE,
      }),
    {
      manual: !agentOpen,
      reloadDeps: [agentOpen],
      isNoMore: (page) => Boolean(page && (page.total === 0 || page.list.length >= page.total)),
    }
  );

  const showSkeleton = personalPage == null && loadingPersonal;
  const personalAgents = personalPage?.list ?? [];
  // 保持列表顺序；选中项只补充来源信息，不在点击后移到列表前面。
  const displayAgents = mergeAgentOptions(
    [
      buildDefaultPersonalAgent(),
      ...personalAgents.map((agent) =>
        agent.agentId === selectedAgent.agentId ? selectedAgent : agent
      ),
      selectedAgent,
    ],
    injectedAgents
  );
  const hasMorePersonalAgents = Boolean(personalPage) && !noMorePersonal;
  const injectedAgentKey = JSON.stringify(injectedAgents ?? []);
  const preferredAgentKey = JSON.stringify(preferredAgent ?? null);
  const injectedAgentsLatest = useLatest(injectedAgents);
  const preferredAgentLatest = useLatest(preferredAgent);

  const syncPreferredAgent = () => {
    const injectedAgentIds = new Set(
      (injectedAgentsLatest.current ?? []).map((agent) => agent.agentId)
    );
    const currentPreferredAgent = preferredAgentLatest.current;
    const currentAgent = store.getState().selectedAgent;
    if (currentAgent.source === 'CURRENT_DRAFT' && !injectedAgentIds.has(currentAgent.agentId)) {
      setSelectedAgent(buildDefaultPersonalAgent());
      return;
    }
    if (!currentPreferredAgent) return;
    if (!currentAgent.isDefault && currentAgent.source !== 'CURRENT_DRAFT') return;
    if (currentAgent.agentId === currentPreferredAgent.agentId) {
      if (currentAgent.source === 'CURRENT_DRAFT' && currentAgent !== currentPreferredAgent) {
        setSelectedAgent(currentPreferredAgent);
      }
      return;
    }
    setSelectedAgent(currentPreferredAgent);
  };

  /**
   * @wisepen-manual-effect
   * 执行时机：外部注入的 Agent 集合或首选 Agent 变化时校正聊天输入 store。
   * 不可替代原因：选中 Agent 保存在独立 Zustand store，不能由当前组件 JSX 直接派生。
   * cleanup：没有订阅或异步任务，无需清理。
   */
  useEffect(syncPreferredAgent, [
    injectedAgentKey,
    injectedAgentsLatest,
    preferredAgentKey,
    preferredAgentLatest,
    setSelectedAgent,
    store,
  ]);

  const handleSelect = (agent: ChatAgentOption) => {
    setSelectedAgent(agent);
    setAgentOpen(false);
  };

  const handleOpenGroupModal = () => {
    setAgentOpen(false);
    setGroupModalOpen(true);
  };

  const getAgentLabel = (agent: ChatAgentOption): string =>
    agent.isDefault ? t('input.agentPicker.defaultAgent') : agent.label;

  const agentTooltip = selectedAgent.isDefault
    ? t('input.agentPicker.selectAgentTooltip')
    : getAgentLabel(selectedAgent);

  const handleMenuAction = (key: Key) => {
    if (key === LOAD_MORE_PERSONAL_ACTION) {
      loadMorePersonal();
      return;
    }
    if (key === SELECT_FROM_GROUP_ACTION) {
      handleOpenGroupModal();
      return;
    }
    const agent = displayAgents.find((item) => item.agentId === key);
    if (agent) {
      handleSelect(agent);
    }
  };

  return {
    agentOpen,
    setAgentOpen,
    selectedAgent,
    groupModalOpen,
    setGroupModalOpen,
    showSkeleton,
    displayAgents,
    hasMorePersonalAgents,
    loadingMorePersonal,
    agentTooltip,
    getAgentLabel,
    handleMenuAction,
    setSelectedAgent,
  };
}
