import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import type { DriveSelectionItem } from '@/components/business/Drive/common/driveComponentModel';
import DriveNavigator from '@/components/business/Drive/DriveNavigator';
import { type ChatAgentOption } from '@/domains/Chat';
import type { ResourceSkillSummary } from '@/domains/Resource';

import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';
import styles from './style.module.less';

interface SkillSelectionOption {
  skill: ResourceSkillSummary;
  sourceAgent: ChatAgentOption | null;
}

function OtherSkillModal() {
  const open = useChatInputStore((state) => state.otherSkillModalOpen);
  if (!open) return null;
  return <OtherSkillModalContent />;
}

function OtherSkillModalContent() {
  const { t } = useTranslation(['chat', 'common']);
  const { currentAgent, selectedSkills } = useChatInputStore(
    useShallow((state) => ({
      currentAgent: state.selectedAgent,
      selectedSkills: state.selectedSkills,
    }))
  );
  const { replaceExternalSkills, setOtherSkillModalOpen } = useChatInputStoreApi().getState();
  const initialSelectedSkills = selectedSkills.filter((skill) => skill.external);
  const [selectedSkillMap, setSelectedSkillMap] = useState<Map<string, SkillSelectionOption>>(
    () =>
      new Map(
        initialSelectedSkills.map((skill) => [
          skill.skillId,
          {
            skill: {
              skillId: skill.skillId,
              displayName: skill.displayName,
              currentVersionId: skill.currentVersionId,
              scopeType: skill.scopeType ?? (skill.groupId ? 'GROUP' : 'PERSONAL'),
              groupId: skill.groupId,
              groupName: skill.groupName,
            },
            sourceAgent: skill.groupId
              ? {
                  agentId: skill.sourceAgentId ?? `agent-group-${skill.groupId}`,
                  agentType: 'GROUP',
                  label: skill.sourceAgentLabel ?? skill.groupName ?? '',
                  source: 'RESOURCE',
                  groupId: skill.groupId,
                  groupName: skill.groupName,
                }
              : null,
          },
        ])
      )
  );
  const hasNavigatorSelectionRef = useRef(false);

  const buildSourceAgent = (item: DriveSelectionItem): ChatAgentOption | null => {
    if (!item.groupId) return null;
    return {
      agentId:
        currentAgent.groupId === item.groupId
          ? currentAgent.agentId
          : `agent-group-${item.groupId}`,
      agentType: 'GROUP',
      label: item.scopeLabel ?? '',
      source: 'RESOURCE',
      groupId: item.groupId,
      groupName: item.scopeLabel,
    };
  };

  const mapSelectionItem = (item: DriveSelectionItem): SkillSelectionOption | null => {
    if (!item.resourceId || (item.kind !== 'resource' && item.kind !== 'link')) return null;
    return {
      skill: {
        skillId: item.resourceId,
        displayName: item.label,
        description: '',
        scopeType: item.groupId ? 'GROUP' : 'PERSONAL',
        groupId: item.groupId,
        groupName: item.scopeLabel,
      },
      sourceAgent: buildSourceAgent(item),
    };
  };

  const handleSelectionChange = (items: DriveSelectionItem[]) => {
    if (items.length === 0 && !hasNavigatorSelectionRef.current) return;
    hasNavigatorSelectionRef.current = true;
    const selectedIds = new Set(items.map((item) => item.resourceId).filter(Boolean));
    setSelectedSkillMap((current) => {
      const next = new Map([...current.entries()].filter(([skillId]) => selectedIds.has(skillId)));
      items.forEach((item) => {
        const option = mapSelectionItem(item);
        if (option) next.set(option.skill.skillId, option);
      });
      return next;
    });
  };

  function handleClose(): void {
    setOtherSkillModalOpen(false);
  }

  const handleOpenChange = (visible: boolean) => {
    if (!visible) handleClose();
  };

  const handleConfirm = () => {
    replaceExternalSkills([...selectedSkillMap.values()]);
    handleClose();
  };

  return (
    <AppModal
      isOpen
      onOpenChange={handleOpenChange}
      title={t('input.otherSkillPicker.title')}
      size="md"
      contentMode="dialog"
    >
      <AppModal.DeferredContent
        fallback={
          <AppModal.Body>
            <div className={styles.wrapper}>
              <div className={styles.hint}>{t('input.otherSkillPicker.hint')}</div>
              <div className={styles.treeNav} />
            </div>
          </AppModal.Body>
        }
      >
        {() => (
          <AppModal.Body>
            <div className={styles.wrapper}>
              <div className={styles.hint}>{t('input.otherSkillPicker.hint')}</div>
              <div className={styles.treeNav}>
                <DriveNavigator
                  scopeMode="public"
                  resourceType="SKILL"
                  selectableTypes={['resource', 'link']}
                  excludedGroupIds={currentAgent.groupId ? [currentAgent.groupId] : undefined}
                  initialSelectedIds={initialSelectedSkills.map((skill) => skill.skillId)}
                  multiple
                  dimUnselectableNodes={false}
                  onChange={handleSelectionChange}
                />
              </div>
            </div>
          </AppModal.Body>
        )}
      </AppModal.DeferredContent>
      <AppModal.Footer>
        <AppButton variant="secondary" onPress={handleClose}>
          {t('actions.cancel', { ns: 'common' })}
        </AppButton>
        <AppButton variant="primary" onPress={handleConfirm}>
          {t('actions.confirm', { ns: 'common' })}
        </AppButton>
      </AppModal.Footer>
    </AppModal>
  );
}

export default OtherSkillModal;
