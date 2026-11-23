import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import type { DriveSelectionItem } from '@/components/business/Drive/common/driveComponentModel';
import DriveNavigator from '@/components/business/Drive/DriveNavigator';

import type { GroupAgentPickerModalProps } from './index.type';
import styles from './style.module.scss';

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

export default GroupAgentPickerModal;
