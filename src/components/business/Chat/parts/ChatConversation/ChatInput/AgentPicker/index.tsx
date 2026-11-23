import { Description, Header, Label, Separator } from '@heroui/react';
import { Bot, BotOff, ChevronDown, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import Dropdown from '@/components/base/Dropdown';
import { GuideAnchor } from '@/components/base/Guide';
import { GUIDE_TOOL_ID } from '@/constants/tour';
import type { ChatAgentOption } from '@/domains/ChatConfig';

import GroupAgentPickerModal from './GroupAgentPickerModal';
import type { AgentPickerProps } from './index.type';
import AgentMenuSkeleton from './MenuSkeleton';
import styles from './style.module.scss';
import {
  LOAD_MORE_PERSONAL_ACTION,
  SELECT_FROM_GROUP_ACTION,
  useAgentPicker,
} from './useAgentPicker';

function renderAgentIcon(agent: ChatAgentOption, size: number) {
  return agent.isDefault ? (
    <BotOff size={size} aria-hidden="true" />
  ) : (
    <Bot size={size} aria-hidden="true" />
  );
}

function AgentPicker({ injectedAgents, preferredAgent }: AgentPickerProps) {
  const { t } = useTranslation('chat');
  const {
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
  } = useAgentPicker({ injectedAgents, preferredAgent });

  return (
    <>
      <Dropdown isOpen={agentOpen} onOpenChange={setAgentOpen}>
        <Dropdown.Trigger
          render={({ disabled, ...triggerProps }) => (
            <GuideAnchor id={GUIDE_TOOL_ID.chatAgent}>
              <AppIconButton
                {...triggerProps}
                isDisabled={disabled}
                icon={renderAgentIcon(selectedAgent, 17)}
                label={t('input.agentPicker.trigger')}
                tooltip={{ content: agentTooltip }}
              />
            </GuideAnchor>
          )}
        />
        <GuideAnchor id={GUIDE_TOOL_ID.chatAgentOpen} asChild>
          <Dropdown.Popover className={styles.popoverPanelAgent} placement="top">
            {showSkeleton ? (
              <AgentMenuSkeleton ariaLabel={t('input.agentPicker.loadingAria')} />
            ) : (
              <Dropdown.Menu
                aria-label={t('input.agentPicker.trigger')}
                onAction={handleMenuAction}
              >
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
        </GuideAnchor>
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

export default AgentPicker;
