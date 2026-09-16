import { Description, Dropdown, Header, Label, Separator, Skeleton } from '@heroui/react';
import { Settings, Sparkles, Wrench } from 'lucide-react';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { buildSkillMenuSections, type ChatInputCapabilityOptions } from '@/domains/Chat';

import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';
import styles from '../style.module.less';

const SKILL_SKELETON_PRIMARY_ROWS = [0, 1] as const;
const SKILL_SKELETON_TOOL_ROWS = [0, 1, 2, 3, 4, 5] as const;
const SELECT_OTHER_SKILL_ACTION = 'skill-action:select-other';

function SkillMenuSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div aria-busy="true" aria-label={ariaLabel}>
      <div className={styles.popoverSkeletonList}>
        <Skeleton className={styles.popoverSkeletonSection} />
        {SKILL_SKELETON_PRIMARY_ROWS.map((row) => (
          <div key={`skill-${row}`} className={styles.popoverSkeletonRow}>
            <Skeleton className={styles.popoverSkeletonIcon} />
            <Skeleton
              className={`${styles.popoverSkeletonLabel} ${row === 1 ? styles.popoverSkeletonLabelWide : ''}`}
            />
          </div>
        ))}
        <Skeleton className={styles.popoverSkeletonSection} />
        {SKILL_SKELETON_TOOL_ROWS.map((row) => (
          <div key={`tool-${row}`} className={styles.popoverSkeletonRow}>
            <Skeleton className={styles.popoverSkeletonIcon} />
            <Skeleton
              className={`${styles.popoverSkeletonLabel} ${row % 2 === 0 ? styles.popoverSkeletonLabelWide : ''}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface SkillMenuProps {
  options?: ChatInputCapabilityOptions;
  loading: boolean;
}

function SkillMenu({ options, loading }: SkillMenuProps) {
  const { t } = useTranslation('chat');
  const store = useChatInputStoreApi();
  const { selectedAgent, selectedSkills, selectedTools, skillMenuOpen } = useChatInputStore(
    useShallow((state) => ({
      selectedAgent: state.selectedAgent,
      selectedSkills: state.selectedSkills,
      selectedTools: state.selectedTools,
      skillMenuOpen: state.skillMenuOpen,
    }))
  );
  const { removeSkill, setOtherSkillModalOpen, setSkillMenuOpen, toggleSkill, toggleTool } =
    store.getState();
  const showSkeleton = !options && loading;
  const sections = buildSkillMenuSections({
    primarySkills: options?.primarySkills ?? [],
    selectedSkills,
    selectedTools,
    toolOptions: options?.tools ?? [],
    advancedMode: true,
    otherSkillGroups: [],
  });
  const primarySection = sections.find((section) => section.key === 'primary-skills');
  const externalSection = sections.find((section) => section.key === 'external-skills');
  const toolSection = sections.find((section) => section.key === 'tools');
  const selectedSkillIds = selectedSkills.map((skill) => skill.skillId);
  const selectedToolIds = selectedTools.map((tool) => tool.toolId);
  const externalItems =
    externalSection?.items.filter((item) => item.kind === 'external-skill') ?? [];
  const hasPrimaryItems = Boolean(primarySection?.items.length);
  const hasExternalItems = externalItems.length > 0;
  const hasToolItems = Boolean(toolSection?.items.length);
  const hasCapabilityItems = hasPrimaryItems || hasExternalItems || hasToolItems;
  const selectedOptionCount = selectedSkills.length + selectedTools.length;
  const skeleton = <SkillMenuSkeleton ariaLabel={t('input.skillMenu.loadingAria')} />;

  function handleToggleSkill(skillId: string): void {
    const skill = options?.primarySkills.find((item) => item.skillId === skillId);
    if (!skill) return;
    toggleSkill(skill, selectedAgent);
  }

  function handleToggleTool(toolId: string): void {
    const tool = options?.tools.find((item) => item.toolId === toolId);
    if (!tool) return;
    toggleTool(tool);
  }

  function handleSelectOther(): void {
    setSkillMenuOpen(false);
    setOtherSkillModalOpen(true);
  }

  function handleMenuAction(key: Key): void {
    if (key === SELECT_OTHER_SKILL_ACTION) {
      handleSelectOther();
      return;
    }
    if (primarySection?.items.some((item) => item.key === key)) {
      handleToggleSkill(String(key));
      return;
    }
    if (externalItems.some((item) => item.key === key)) {
      removeSkill(String(key));
      return;
    }
    if (toolSection?.items.some((item) => item.key === key)) {
      handleToggleTool(String(key));
    }
  }

  function getSkillSourceText(skillId: string): string | null {
    const selectedSkill = selectedSkills.find((skill) => skill.skillId === skillId);
    const sourceName = selectedSkill?.groupName || selectedSkill?.sourceAgentLabel;
    if (!sourceName) return null;
    const localizedSourceName =
      selectedSkill.sourceAgentId === 'agent-personal-default'
        ? t('input.agentPicker.defaultAgent')
        : sourceName;
    return t('input.skillMenu.providedBy', { name: localizedSourceName });
  }

  return (
    <Dropdown isOpen={skillMenuOpen} onOpenChange={setSkillMenuOpen}>
      <span className={styles.toolButtonWrap}>
        {selectedOptionCount > 0 ? (
          <span className={styles.skillMenuBadge}>{selectedOptionCount}</span>
        ) : null}
        <AppIconButton
          icon={<Settings size={17} aria-hidden="true" />}
          label={t('input.skillMenu.configure')}
          overlayTrigger={<Dropdown.Trigger />}
        />
      </span>
      <Dropdown.Popover className={styles.popoverPanelScrollable} placement="top">
        {showSkeleton ? (
          skeleton
        ) : (
          <Dropdown.Menu aria-label={t('input.skillMenu.configure')} onAction={handleMenuAction}>
            {hasPrimaryItems ? (
              <Dropdown.Section
                id="primary-skills"
                selectionMode="multiple"
                selectedKeys={selectedSkillIds}
              >
                <Header>{t('input.skillMenu.title')}</Header>
                {primarySection?.items.map((item) => (
                  <Dropdown.Item key={item.key} id={item.key} textValue={item.label}>
                    <Sparkles size={16} aria-hidden="true" />
                    <Label>{item.label}</Label>
                    <Dropdown.ItemIndicator />
                  </Dropdown.Item>
                ))}
              </Dropdown.Section>
            ) : null}

            {hasPrimaryItems && hasExternalItems ? <Separator /> : null}
            {hasExternalItems ? (
              <Dropdown.Section
                id="external-skills"
                selectionMode="multiple"
                selectedKeys={externalItems.map((item) => item.key)}
              >
                <Header>
                  {t(hasPrimaryItems ? 'input.skillMenu.otherTitle' : 'input.skillMenu.title')}
                </Header>
                {externalItems.map((item) => (
                  <Dropdown.Item key={item.key} id={item.key} textValue={item.label}>
                    <Sparkles size={16} aria-hidden="true" />
                    <span className={styles.listItemText}>
                      <Label>{item.label}</Label>
                      {getSkillSourceText(item.key) ? (
                        <Description>{getSkillSourceText(item.key)}</Description>
                      ) : null}
                    </span>
                    <Dropdown.ItemIndicator />
                  </Dropdown.Item>
                ))}
              </Dropdown.Section>
            ) : null}

            {(hasPrimaryItems || hasExternalItems) && hasToolItems ? <Separator /> : null}
            {hasToolItems ? (
              <Dropdown.Section id="tools" selectionMode="multiple" selectedKeys={selectedToolIds}>
                <Header>
                  {t(
                    hasPrimaryItems || hasExternalItems
                      ? 'input.skillMenu.toolsTitle'
                      : 'input.skillMenu.title'
                  )}
                </Header>
                {toolSection?.items.map((item) => (
                  <Dropdown.Item key={item.key} id={item.key} textValue={item.label}>
                    <Wrench size={16} aria-hidden="true" />
                    <Label>{item.label}</Label>
                    <Dropdown.ItemIndicator />
                  </Dropdown.Item>
                ))}
              </Dropdown.Section>
            ) : null}

            {hasCapabilityItems ? <Separator /> : null}
            <Dropdown.Section>
              {!hasCapabilityItems ? <Header>{t('input.skillMenu.title')}</Header> : null}
              <Dropdown.Item
                id={SELECT_OTHER_SKILL_ACTION}
                textValue={t('input.skillMenu.selectOther')}
              >
                <Sparkles size={14} aria-hidden="true" />
                <Label>{t('input.skillMenu.selectOther')}</Label>
              </Dropdown.Item>
            </Dropdown.Section>
          </Dropdown.Menu>
        )}
      </Dropdown.Popover>
    </Dropdown>
  );
}

export default SkillMenu;
