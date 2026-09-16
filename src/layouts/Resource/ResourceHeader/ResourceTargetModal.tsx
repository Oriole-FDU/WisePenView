import { useMemoizedFn } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import type { DriveSelectionItem } from '@/components/business/Drive/common/driveComponentModel';
import DriveNavigator from '@/components/business/Drive/DriveNavigator';
import type { DriveNavigatorScopeMode } from '@/components/business/Drive/DriveNavigator/index.type';
import type { DriveContainerNode, DriveNode, DriveNodeScope } from '@/domains/Drive';

import styles from './ResourceTargetModal.module.less';

interface ResourceTargetModalProps {
  isOpen: boolean;
  title: string;
  hint: string;
  scopeMode?: DriveNavigatorScopeMode;
  scope: DriveNodeScope;
  excludedGroupIds?: string[];
  submitting: boolean;
  confirmText?: string;
  isTargetSelectable?: (target: DriveSelectionItem) => boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (target: DriveContainerNode) => void;
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
  const [target, setTarget] = useState<DriveContainerNode>();
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
          <AppButton
            variant="secondary"
            isDisabled={submitting}
            onPress={() => handleOpenChange(false)}
          >
            {t('actions.cancel')}
          </AppButton>
          <AppButton
            variant="primary"
            isDisabled={!target || submitting}
            aria-busy={submitting || undefined}
            onPress={() => target && onConfirm(target)}
          >
            {confirmText ?? t('actions.confirm')}
          </AppButton>
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
            dimUnselectableNodes={false}
            isNodeSelectable={isNavigatorNodeSelectable}
            onNodeChange={(nodes) => {
              const node = nodes[0];
              setTarget(
                node && (node.type === 'root' || node.type === 'folder') ? node : undefined
              );
            }}
          />
        </div>
      </div>
    </AppModal>
  );
}

export default ResourceTargetModal;
