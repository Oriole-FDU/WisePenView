import { Description, Dropdown, Header, Label, Separator, Skeleton } from '@heroui/react';
import { useInfiniteScroll, useLatest } from 'ahooks';
import { Bot, BotOff, ChevronDown, Folder } from 'lucide-react';
import type { Key } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import AppIconButton from '@/components/base/Button/AppIconButton';
import type { DriveSelectionItem } from '@/components/business/Drive/common/driveComponentModel';
import DriveNavigator from '@/components/business/Drive/DriveNavigator';
import { useChatService } from '@/domains';
import { buildDefaultPersonalAgent, type ChatAgentOption, type PageResult } from '@/domains/Chat';

import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';
import styles from '../style.module.less';

interface AgentPickerProps {
  injectedAgents?: ChatAgentOption[];
  preferredAgent?: ChatAgentOption | null;
}

const AGENT_SKELETON_ROWS = [0, 1] as const;
const AGENT_PAGE_SIZE = 30;
const LOAD_MORE_PERSONAL_ACTION = 'agent-action:load-more-personal';
const SELECT_FROM_GROUP_ACTION = 'agent-action:select-from-group';

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

function AgentMenuSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div className={styles.popoverPanelAgentSkeleton} aria-busy="true" aria-label={ariaLabel}>
      <Skeleton className={styles.popoverSkeletonSection} />
      <div className={styles.popoverSkeletonList}>
        {AGENT_SKELETON_ROWS.map((row) => (
          <div key={row} className={styles.popoverSkeletonRow}>
            <Skeleton className={styles.popoverSkeletonIcon} />
            <Skeleton
              className={`${styles.popoverSkeletonLabel} ${row === 0 ? styles.popoverSkeletonLabelWide : ''}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentPicker({ injectedAgents, preferredAgent }: AgentPickerProps) {
  const { t } = useTranslation('chat');
  const chatService = useChatService();
  const store = useChatInputStoreApi();
  const selectedAgent = useChatInputStore((state) => state.selectedAgent);
  const { setSelectedAgent } = store.getState();
  const [open, setOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const {
    data: personalPage,
    loading: loadingPersonal,
    loadingMore: loadingMorePersonal,
    noMore: noMorePersonal,
    loadMore: loadMorePersonal,
  } = useInfiniteScroll<AgentPageState>(
    async (current) =>
      chatService.listChatInputAgents({
        scope: 'PERSONAL',
        page: Math.floor((current?.list.length ?? 0) / AGENT_PAGE_SIZE) + 1,
        size: AGENT_PAGE_SIZE,
      }),
    {
      manual: !open,
      reloadDeps: [open],
      isNoMore: (page) => Boolean(page && (page.total === 0 || page.list.length >= page.total)),
    }
  );
  const showSkeleton = personalPage == null && loadingPersonal;
  const personalAgents = personalPage?.list ?? [];
  const displayAgents = mergeAgentOptions(
    [buildDefaultPersonalAgent(), selectedAgent, ...personalAgents],
    injectedAgents
  );
  const hasMorePersonalAgents = Boolean(personalPage) && !noMorePersonal;
  const injectedAgentKey = JSON.stringify(injectedAgents ?? []);
  const preferredAgentKey = JSON.stringify(preferredAgent ?? null);
  const injectedAgentsLatest = useLatest(injectedAgents);
  const preferredAgentLatest = useLatest(preferredAgent);
  const skeleton = <AgentMenuSkeleton ariaLabel={t('input.agentPicker.loadingAria')} />;

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

  const handleOpenGroupModal = () => {
    setOpen(false);
    setGroupModalOpen(true);
  };

  const getAgentLabel = (agent: ChatAgentOption): string =>
    agent.isDefault ? t('input.agentPicker.defaultAgent') : agent.label;

  const renderAgentIcon = (agent: ChatAgentOption, size: number) =>
    agent.isDefault ? (
      <BotOff size={size} aria-hidden="true" />
    ) : (
      <Bot size={size} aria-hidden="true" />
    );

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

  return (
    <>
      <Dropdown isOpen={open} onOpenChange={setOpen}>
        <AppIconButton
          icon={renderAgentIcon(selectedAgent, 17)}
          label={t('input.agentPicker.trigger')}
          tooltip={{ content: getAgentLabel(selectedAgent) }}
          overlayTrigger={<Dropdown.Trigger />}
        />
        <Dropdown.Popover className={styles.popoverPanelAgent} placement="top">
          {showSkeleton ? (
            skeleton
          ) : (
            <Dropdown.Menu aria-label={t('input.agentPicker.trigger')} onAction={handleMenuAction}>
              <Dropdown.Section selectionMode="single" selectedKeys={[selectedAgent.agentId]}>
                <Header>{t('input.agentPicker.title')}</Header>
                {displayAgents.map((agent) => {
                  const description =
                    agent.source === 'CURRENT_DRAFT'
                      ? t('input.agentPicker.currentDraft')
                      : agent.agentType === 'GROUP' && agent.groupName
                        ? agent.groupName
                        : null;
                  return (
                    <Dropdown.Item
                      key={agent.agentId}
                      id={agent.agentId}
                      textValue={getAgentLabel(agent)}
                    >
                      {renderAgentIcon(agent, 14)}
                      <span className={styles.listItemText}>
                        <Label>{getAgentLabel(agent)}</Label>
                        {description ? <Description>{description}</Description> : null}
                      </span>
                      <Dropdown.ItemIndicator />
                    </Dropdown.Item>
                  );
                })}
              </Dropdown.Section>
              {hasMorePersonalAgents ? <Separator /> : null}
              {hasMorePersonalAgents ? (
                <Dropdown.Section>
                  <Dropdown.Item
                    id={LOAD_MORE_PERSONAL_ACTION}
                    textValue={t('session.loadMore')}
                    isDisabled={loadingMorePersonal}
                    shouldCloseOnSelect={false}
                  >
                    <ChevronDown size={14} aria-hidden="true" />
                    <Label>{t('session.loadMore')}</Label>
                  </Dropdown.Item>
                </Dropdown.Section>
              ) : null}
              <Separator />
              <Dropdown.Section>
                <Dropdown.Item
                  id={SELECT_FROM_GROUP_ACTION}
                  textValue={t('input.agentPicker.selectFromGroup')}
                >
                  <Folder size={14} color="var(--resource-icon-folder)" aria-hidden="true" />
                  <Label>{t('input.agentPicker.selectFromGroup')}</Label>
                </Dropdown.Item>
              </Dropdown.Section>
            </Dropdown.Menu>
          )}
        </Dropdown.Popover>
      </Dropdown>
      <GroupAgentPickerModal
        open={groupModalOpen}
        selectedAgentId={selectedAgent.agentId}
        onOpenChange={setGroupModalOpen}
        onSelect={setSelectedAgent}
      />
    </>
  );
}

interface GroupAgentPickerModalProps {
  open: boolean;
  selectedAgentId: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (agent: ChatAgentOption) => void;
}

function GroupAgentPickerModal({
  open,
  selectedAgentId,
  onOpenChange,
  onSelect,
}: GroupAgentPickerModalProps) {
  if (!open) return null;
  return (
    <GroupAgentPickerModalContent
      selectedAgentId={selectedAgentId}
      onOpenChange={onOpenChange}
      onSelect={onSelect}
    />
  );
}

function GroupAgentPickerModalContent({
  selectedAgentId,
  onOpenChange,
  onSelect,
}: Omit<GroupAgentPickerModalProps, 'open'>) {
  const { t } = useTranslation(['chat', 'common']);
  const selectedResourceId = selectedAgentId.startsWith('agent-')
    ? selectedAgentId.slice('agent-'.length)
    : selectedAgentId;

  const handleSelectionChange = (items: DriveSelectionItem[]) => {
    const item = items[0];
    if (!item?.resourceId || item.kind !== 'resource') return;
    onSelect({
      agentId: `agent-${item.resourceId}`,
      agentType: 'GROUP',
      label: item.label,
      source: 'RESOURCE',
      resourceId: item.resourceId,
      groupId: item.groupId,
      groupName: item.scopeLabel,
    });
    onOpenChange(false);
  };

  return (
    <AppModal
      isOpen
      onOpenChange={onOpenChange}
      title={t('input.agentPicker.groupModalTitle')}
      size="md"
      contentMode="dialog"
      footer={false}
    >
      <AppModal.DeferredContent
        fallback={
          <AppModal.Body>
            <div className={styles.agentGroupModalBody}>
              <div className={styles.agentGroupModalHint}>{t('input.agentPicker.groupHint')}</div>
              <div className={styles.agentGroupModalTree} />
            </div>
          </AppModal.Body>
        }
      >
        {() => (
          <AppModal.Body>
            <div className={styles.agentGroupModalBody}>
              <div className={styles.agentGroupModalHint}>{t('input.agentPicker.groupHint')}</div>
              <div className={styles.agentGroupModalTree}>
                <DriveNavigator
                  scopeMode="public"
                  resourceType="AGENT"
                  selectableTypes={['resource']}
                  initialSelectedIds={[selectedResourceId]}
                  dimUnselectableNodes={false}
                  onChange={handleSelectionChange}
                />
              </div>
            </div>
          </AppModal.Body>
        )}
      </AppModal.DeferredContent>
    </AppModal>
  );
}

export default AgentPicker;
