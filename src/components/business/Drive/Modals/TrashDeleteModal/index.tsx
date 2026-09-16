import { toast } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import AppAlertDialog from '@/components/business/AppAlertDialog';
import { clearNewNoteStore } from '@/components/business/Note/_store/useNewNoteStore';
import { removePdfPreviewProgress } from '@/components/business/PdfViewer/_store/usePdfPreviewProgressStore';
import { useDriveService } from '@/domains';
import { useApi } from '@/hooks/useApi';

import type { DriveActionTarget } from '../../common/driveComponentModel';
import type { TrashDeleteModalProps } from './index.type';

function getNodeName(node: DriveActionTarget | undefined, fallback: string): string {
  if (!node) return fallback;
  return node.type === 'folder' ? node.name : node.title;
}

function clearDeletedNodeRuntime(nodes: DriveActionTarget[]): void {
  if (nodes.some((node) => node.type === 'folder')) {
    clearNewNoteStore();
  }
  nodes.forEach((node) => {
    if (node.type !== 'resource') return;
    clearNewNoteStore(node.resourceId);
    removePdfPreviewProgress(node.resourceId);
  });
}

function TrashDeleteModal({ isOpen, nodes, onOpenChange, onSuccess }: TrashDeleteModalProps) {
  const { t } = useTranslation('drive');
  const driveService = useDriveService();

  const { loading, run: runDelete } = useApi(
    async () => {
      if (nodes.length === 0) return;
      await driveService.deleteTrashedNodes({ nodes });
    },
    {
      manual: true,
      onSuccess: () => {
        clearDeletedNodeRuntime(nodes);
        toast.success(
          nodes.length === 1
            ? t('delete.feedback.permanentlyDeleted')
            : t('delete.feedback.permanentlyDeletedBatch', { count: nodes.length })
        );
        onSuccess?.();
        onOpenChange(false);
      },
    }
  );

  const node = nodes.length === 1 ? nodes[0] : undefined;
  const nodeName = getNodeName(node, t('delete.unnamed'));
  const description =
    nodes.length > 1
      ? t('delete.description.permanentBatch', { count: nodes.length })
      : node?.type === 'folder'
        ? t('delete.description.permanentFolder', { name: nodeName })
        : t('delete.description.permanentResource', { name: nodeName });

  return (
    <AppAlertDialog
      type="danger"
      isOpen={isOpen && nodes.length > 0}
      onOpenChange={onOpenChange}
      title={t('delete.permanent')}
      description={description}
      confirmText={t('delete.permanent')}
      onConfirm={() => runDelete()}
      isConfirmLoading={loading}
      isDismissable={!loading}
    />
  );
}

export default TrashDeleteModal;
