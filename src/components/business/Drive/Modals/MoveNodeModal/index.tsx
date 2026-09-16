import { toast } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import { useDriveService } from '@/domains';
import type { DriveContainerNode } from '@/domains/Drive';
import { useApi } from '@/hooks/useApi';

import { type DriveActionTarget, getDriveScopeGroupId } from '../../common/driveComponentModel';
import DriveFolderPickerModal from '../DriveFolderPickerModal';
import type { MoveNodeModalProps } from './index.type';

const getNodeName = (node: DriveActionTarget): string => {
  if (node.type === 'folder') return node.name;
  if (node.type === 'resource' || node.type === 'link') return node.title;
  return '';
};

function MoveNodeModal({
  isOpen,
  nodes,
  rootId,
  groupId,
  isTrashView = false,
  onOpenChange,
  onSuccess,
  onError,
}: MoveNodeModalProps) {
  const { t } = useTranslation(['drive', 'common']);
  const driveService = useDriveService();
  const effectiveRootId = nodes[0]?.scope.rootId ?? rootId;
  const effectiveGroupId = groupId ?? (nodes[0] ? getDriveScopeGroupId(nodes[0].scope) : undefined);

  const disabledTargetIds = (() => {
    const next = new Set(nodes.map((node) => node.id));
    if (
      effectiveGroupId &&
      nodes.some((node) => node.type === 'resource' || node.type === 'link')
    ) {
      next.add(effectiveRootId);
    }
    return next;
  })();

  const { loading: moving, run: runMove } = useApi(
    async (target: DriveContainerNode) => {
      if (nodes.length === 0) return { requestedCount: 0, affectedCount: 0 };
      return driveService.moveNodes({ nodes, target });
    },
    {
      manual: true,
      onSuccess: (result, [target]) => {
        const movedCount = result.affectedCount;
        if (movedCount === 0) {
          toast.success(t('move.feedback.alreadyThere'));
          onOpenChange(false);
          return;
        }
        toast.success(
          isTrashView
            ? t('move.feedback.movedToDrive', { count: movedCount })
            : t('move.feedback.moved', { count: movedCount })
        );
        onSuccess?.(target);
        onOpenChange(false);
      },
      onErrorEffect: () => {
        onError?.();
      },
    }
  );

  return (
    <DriveFolderPickerModal
      isOpen={isOpen && nodes.length > 0}
      title={isTrashView ? t('move.titleToDrive') : t('move.titleToFolder')}
      hint={
        nodes.length === 1
          ? t('move.selectedItem', { name: getNodeName(nodes[0]) })
          : t('move.selectedCount', { count: nodes.length })
      }
      rootId={effectiveRootId}
      groupId={effectiveGroupId}
      disabledNodeIds={[...disabledTargetIds]}
      isSubmitting={moving}
      confirmText={t('actions.confirm', { ns: 'common' })}
      cancelText={t('actions.cancel', { ns: 'common' })}
      onOpenChange={onOpenChange}
      onConfirm={runMove}
    />
  );
}

export default MoveNodeModal;
