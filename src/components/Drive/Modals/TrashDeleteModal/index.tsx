import { clearNewNoteStore } from '@/components/Note/_store/useNewNoteStore';
import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import { removePdfPreviewProgress } from '@/components/PdfViewer/_store/usePdfPreviewProgressStore';
import { useDriveService, useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useTranslation } from 'react-i18next';

import type { DriveActionTarget } from '../../common/driveComponentModel';
import type { TrashDeleteModalProps } from './index.type';

function getNodeName(node: DriveActionTarget | null, fallback: string): string {
  if (!node) return fallback;
  return node.type === 'folder' ? node.name : node.title;
}

function TrashDeleteModal({ isOpen, node, onOpenChange, onSuccess }: TrashDeleteModalProps) {
  const { t } = useTranslation('drive');
  const driveService = useDriveService();
  const resourceService = useResourceService();

  const { loading, run: runDelete } = useRequest(
    async () => {
      if (!node) return;
      if (node.type === 'resource') {
        await resourceService.removeResources({ resourceIds: [node.resourceId] });
        return;
      }
      await driveService.removeNode({ nodeId: node.id });
    },
    {
      manual: true,
      onSuccess: () => {
        if (node?.type === 'folder') {
          clearNewNoteStore();
        } else if (node?.type === 'resource') {
          clearNewNoteStore(node.resourceId);
          removePdfPreviewProgress(node.resourceId);
        }
        toast.success(t('delete.feedback.permanentlyDeleted'));
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const nodeName = getNodeName(node, t('delete.unnamed'));
  const description =
    node?.type === 'folder'
      ? t('delete.description.permanentFolder', { name: nodeName })
      : t('delete.description.permanentResource', { name: nodeName });

  return (
    <AppAlertDialog
      type="danger"
      isOpen={isOpen && !!node}
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
