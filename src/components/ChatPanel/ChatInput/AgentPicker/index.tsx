import AppIconButton from '@/components/Button/AppIconButton';
import { AppPopover } from '@/components/Overlay';
import { useChatService } from '@/domains';
import type { ChatAgentOption } from '@/domains/Chat';
import {
  buildChatInputAgentOptions,
  buildDefaultPersonalAgent,
  resolveChatInputSelectedAgent,
} from '@/domains/Chat';
import { parseErrorMessage } from '@/utils/error';
import { ListBox, ListBoxItem, toast } from '@heroui/react';
import { useLatest, useRequest } from 'ahooks';
import { Bot, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';
import styles from '../style.module.less';

interface AgentPickerProps {
  injectedAgents?: ChatAgentOption[];
  preferredAgent?: ChatAgentOption | null;
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

function AgentPicker({ injectedAgents, preferredAgent }: AgentPickerProps) {
  const { t } = useTranslation('chat');
  const chatService = useChatService();
  const store = useChatInputStoreApi();
  const selectedAgent = useChatInputStore((state) => state.selectedAgent);
  const { setSelectedAgent } = store.getState();
  const [open, setOpen] = useState(false);
  const { data: agents = [] } = useRequest(() => chatService.getChatInputAgents(), {
    onSuccess: (nextAgents) => {
      const currentAgent = store.getState().selectedAgent;
      const nextAgent = resolveChatInputSelectedAgent(
        mergeAgentOptions(nextAgents, injectedAgents),
        currentAgent
      );
      if (nextAgent.agentId !== currentAgent.agentId) {
        setSelectedAgent(nextAgent);
      }
    },
    onError: (error) => toast.danger(parseErrorMessage(error)),
  });
  const displayAgents = buildChatInputAgentOptions(
    mergeAgentOptions(agents, injectedAgents),
    selectedAgent
  );
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
    setOpen(false);
  };

  const getAgentLabel = (agent: ChatAgentOption): string =>
    agent.isDefault ? t('input.agentPicker.defaultAgent') : agent.label;

  return (
    <AppPopover isOpen={open} onOpenChange={setOpen}>
      <AppIconButton
        icon={<Bot size={17} aria-hidden="true" />}
        label={t('input.agentPicker.trigger')}
        tooltip={{ content: getAgentLabel(selectedAgent) }}
        overlayTrigger={<AppPopover.Trigger />}
      />
      <AppPopover.Content placement="top" title={t('input.agentPicker.title')}>
        <AppPopover.DeferredContent fallback={<div className={styles.deferredPopoverPanel} />}>
          {() => (
            <div className={styles.popoverPanel}>
              <ListBox
                aria-label={t('input.agentPicker.trigger')}
                selectionMode="single"
                selectedKeys={[selectedAgent.agentId]}
                className={styles.listBox}
              >
                {displayAgents.map((agent) => (
                  <ListBoxItem
                    key={agent.agentId}
                    id={agent.agentId}
                    textValue={getAgentLabel(agent)}
                    onPress={() => handleSelect(agent)}
                  >
                    <span className={styles.agentItem}>
                      <span className={styles.agentMain}>
                        <Bot size={14} />
                        <span>{getAgentLabel(agent)}</span>
                      </span>
                      {agent.source === 'CURRENT_DRAFT' ? (
                        <span className={styles.agentMeta}>
                          {t('input.agentPicker.currentDraft')}
                        </span>
                      ) : agent.agentType === 'GROUP' && agent.groupName ? (
                        <span className={styles.agentMeta}>{agent.groupName}</span>
                      ) : null}
                      {selectedAgent.agentId === agent.agentId ? (
                        <Check size={14} className={styles.checkIcon} />
                      ) : null}
                    </span>
                  </ListBoxItem>
                ))}
              </ListBox>
            </div>
          )}
        </AppPopover.DeferredContent>
      </AppPopover.Content>
    </AppPopover>
  );
}

export default AgentPicker;
