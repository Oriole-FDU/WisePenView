import AppIconButton from '@/components/Button/AppIconButton';
import { Popover } from '@/components/Overlay';
import { useChatService } from '@/domains';
import type { ChatAgentOption } from '@/domains/Chat';
import {
  buildChatInputAgentOptions,
  buildDefaultPersonalAgent,
  resolveChatInputSelectedAgent,
} from '@/domains/Chat';
import { parseErrorMessage } from '@/utils/error';
import { ListBox, ListBoxItem, toast } from '@heroui/react';
import { useMount, useRequest, useUpdateEffect } from 'ahooks';
import { Bot, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  const displayAgents = useMemo(
    () => buildChatInputAgentOptions(mergeAgentOptions(agents, injectedAgents), selectedAgent),
    [agents, injectedAgents, selectedAgent]
  );
  const injectedAgentKey = useMemo(
    () =>
      (injectedAgents ?? [])
        .map((agent) => `${agent.agentId}:${agent.agentVersion ?? ''}`)
        .join('|'),
    [injectedAgents]
  );
  const injectedAgentIds = useMemo(
    () => new Set((injectedAgents ?? []).map((agent) => agent.agentId)),
    [injectedAgents]
  );

  const syncPreferredAgent = () => {
    const currentAgent = store.getState().selectedAgent;
    if (currentAgent.source === 'CURRENT_DRAFT' && !injectedAgentIds.has(currentAgent.agentId)) {
      setSelectedAgent(buildDefaultPersonalAgent());
      return;
    }
    if (!preferredAgent) return;
    if (!currentAgent.isDefault && currentAgent.source !== 'CURRENT_DRAFT') return;
    if (currentAgent.agentId === preferredAgent.agentId) {
      if (currentAgent.source === 'CURRENT_DRAFT' && currentAgent !== preferredAgent) {
        setSelectedAgent(preferredAgent);
      }
      return;
    }
    setSelectedAgent(preferredAgent);
  };

  useMount(syncPreferredAgent);
  useUpdateEffect(syncPreferredAgent, [injectedAgentKey, preferredAgent?.agentId]);

  const handleSelect = (agent: ChatAgentOption) => {
    setSelectedAgent(agent);
    setOpen(false);
  };

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <AppIconButton
        icon={<Bot size={17} aria-hidden="true" />}
        label="选择 Agent"
        tooltip={{ content: selectedAgent.label }}
        overlayTrigger={<Popover.Trigger />}
      />
      <Popover.Content className={styles.toolbarPopover} placement="top">
        <Popover.Dialog>
          <Popover.DeferredContent fallback={<div className={styles.deferredPopoverPanel} />}>
            {() => (
              <div className={styles.popoverPanel}>
                <div className={styles.popoverTitle}>Agent</div>
                <ListBox
                  aria-label="选择 Agent"
                  selectionMode="single"
                  selectedKeys={[selectedAgent.agentId]}
                  className={styles.listBox}
                >
                  {displayAgents.map((agent) => (
                    <ListBoxItem
                      key={agent.agentId}
                      id={agent.agentId}
                      textValue={agent.label}
                      onPress={() => handleSelect(agent)}
                    >
                      <span className={styles.agentItem}>
                        <span className={styles.agentMain}>
                          <Bot size={14} />
                          <span>{agent.label}</span>
                        </span>
                        {agent.source === 'CURRENT_DRAFT' ? (
                          <span className={styles.agentMeta}>当前草稿</span>
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
          </Popover.DeferredContent>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default AgentPicker;
