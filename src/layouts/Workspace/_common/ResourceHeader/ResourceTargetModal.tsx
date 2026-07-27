import DriveNavigator from '@/components/Drive/DriveNavigator';
import type { DriveSelectionItem } from '@/components/Drive/common/driveComponentModel';
import AppModal from '@/components/Overlay/AppModal';
import type { DriveNode, DriveNodeScope } from '@/domains/Drive';
import { Button } from '@heroui/react';
import { useMemoizedFn } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ResourceTargetModal.module.less';

interface ResourceTargetModalProps {
  isOpen: boolean;
  title: string;
  hint: string;
  scopeMode?: 'single' | 'all' | 'groups';
  scope: DriveNodeScope;
  excludedGroupIds?: string[];
  submitting: boolean;
  confirmText?: string;
  isTargetSelectable?: (target: DriveSelectionItem) => boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (target: DriveSelectionItem) => void;
}

function ResourceTargetModal({
  isOpen,
  title,
  hint,
  scopeMode = 'single',
  scope,
  excludedGroupIds,
  submitting,
  confirmText,
  isTargetSelectable,
  onOpenChange,
  onConfirm,
}: ResourceTargetModalProps) {
  const { t } = useTranslation('common');
  const [target, setTarget] = useState<DriveSelectionItem>();
  const isNavigatorNodeSelectable = useMemoizedFn((node: DriveNode) => {
    if (node.type !== 'root' && node.type !== 'folder') return false;
    const item: DriveSelectionItem = {
      nodeId: node.id,
      kind: node.type,
      label: node.name,
      parentNodeId: node.parentId,
      scope: node.scope,
      rootId: node.scope.rootId,
      groupId: node.scope.type === 'group' ? node.scope.groupId : undefined,
      tagId: node.tagId,
    };
    return Boolean(item.tagId && (isTargetSelectable?.(item) ?? true));
  });

  const handleOpenChange = (open: boolean) => {
    if (!open && submitting) return;
    if (!open) setTarget(undefined);
    onOpenChange(open);
  };

  if (!isOpen) return null;

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={title}
      size="md"
      isDismissable={!submitting}
      actions={
        <>
          <Button
            variant="secondary"
            isDisabled={submitting}
            onPress={() => handleOpenChange(false)}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            variant="primary"
            isDisabled={!target || submitting}
            aria-busy={submitting || undefined}
            onPress={() => target && onConfirm(target)}
          >
            {confirmText ?? t('actions.confirm')}
          </Button>
        </>
      }
    >
      <div className={styles.wrapper}>
        <div className={styles.hint}>{hint}</div>
        <div className={styles.treeWrap}>
          <DriveNavigator
            scopeMode={scopeMode}
            excludedGroupIds={excludedGroupIds}
            rootId={scope.rootId}
            groupId={scope.type === 'group' ? scope.groupId : undefined}
            selectableTypes={['root', 'folder']}
            disabled={submitting}
            isNodeSelectable={isNavigatorNodeSelectable}
            onChange={(items) => setTarget(items[0])}
          />
        </div>
      </div>
    </AppModal>
  );
}

export default ResourceTargetModal;
