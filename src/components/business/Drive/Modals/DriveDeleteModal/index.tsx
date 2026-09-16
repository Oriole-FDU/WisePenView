import { toast } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import AppAlertDialog from '@/components/business/AppAlertDialog';
import { useDriveService } from '@/domains';
import { useApi } from '@/hooks/useApi';

import type { DriveActionTarget } from '../../common/driveComponentModel';
import type { DriveDeleteModalProps } from './index.type';

function getNodeName(node: DriveActionTarget | null, fallback: string): string {
  if (!node) return fallback;
  return node.type === 'folder' ? node.name : node.title;
}

function DriveDeleteModal({
  isOpen,
  node,
  groupId,
  onOpenChange,
  onSuccess,
  onError,
}: DriveDeleteModalProps) {
  const { t } = useTranslation('drive');
  const driveService = useDriveService();
  const isGroupNode = Boolean(groupId && node);
  const isGroupResource = Boolean(groupId && node && node.type !== 'folder');

  const { loading, run: runDelete } = useApi(
    async () => {
      if (!node) return;
      if (node.scope.type === 'group') {
        await driveService.removeNodesFromGroup({ nodes: [node] });
        return;
      }
      await driveService.moveNodesToTrash({ nodes: [node] });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(
          node?.type === 'link'
            ? t('delete.feedback.linkDeleted')
            : isGroupNode
              ? t('delete.feedback.removedFromGroup')
              : t('delete.feedback.movedToTrash')
        );
        onSuccess?.();
        onOpenChange(false);
      },
      onErrorEffect: () => {
        onError?.();
      },
    }
  );

  const isFolder = node?.type === 'folder';
  const isLink = node?.type === 'link';
  const isPrimaryGroupMount = Boolean(groupId && node?.type === 'resource');
  const nodeName = getNodeName(node, t('delete.unnamed'));
  const title = isLink
    ? t('delete.deleteLink')
    : isGroupNode
      ? t('delete.removeFromGroup')
      : t('delete.moveToTrash');
  const description = (() => {
    if (isLink) {
      return t('delete.description.link', { name: nodeName });
    }
    if (groupId && isFolder) {
      return t('delete.description.groupFolder', { name: nodeName });
    }
    if (isPrimaryGroupMount) {
      return t('delete.description.primaryGroupResource', { name: nodeName });
    }
    if (isGroupResource) {
      return t('delete.description.groupResource', { name: nodeName });
    }
    if (isFolder) {
      return t('delete.description.folder', { name: nodeName });
    }
    return t('delete.description.resource', { name: nodeName });
  })();
  const confirmText = isLink
    ? t('delete.deleteLink')
    : isGroupNode
      ? t('delete.remove')
      : t('delete.moveToTrash');

  return (
    <AppAlertDialog
      type="danger"
      isOpen={isOpen && !!node}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText={confirmText}
      onConfirm={() => runDelete()}
      isConfirmLoading={loading}
      isDismissable={!loading}
    />
  );
}

export default DriveDeleteModal;
