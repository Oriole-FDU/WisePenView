import { toast } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import AppAlertDialog from '@/components/business/AppAlertDialog';
import { requestDriveRefresh } from '@/components/business/Drive/driveRefresh';
import { clearNewNoteStore } from '@/components/editors/note/_store/useNewNoteStore';
import { removePdfPreviewProgress } from '@/components/editors/pdf/components/PdfViewer/_store/usePdfPreviewProgressStore';
import { useDriveService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { useMyNotesStore } from '@/layouts/Resource/_store/useMyNotesStore';

import type { DriveActionTarget } from '../../common/driveComponentModel';
import type { TrashDeleteModalProps } from './index.type';

function getNodeName(node: DriveActionTarget | undefined, fallback: string): string {
  if (!node) return fallback;
  return node.type === 'folder' ? node.name : node.title;
}

function clearDeletedNodeRuntime(nodes: DriveActionTarget[]): void {
  if (nodes.some((node) => node.type === 'folder')) {
    // 文件夹后代未在本地完整加载，只清新建草稿状态；
    // 「我的笔记」条目都建在云盘根，不会随文件夹被删，因此不做候选的全局失效。
    clearNewNoteStore();
  }
  nodes.forEach((node) => {
    if (node.type !== 'resource') return;
    clearNewNoteStore(node.resourceId);
    useMyNotesStore.setState((state) => ({
      notes: state.notes.filter((note) => note.resourceId !== node.resourceId),
    }));
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
      requestDriveRefresh();
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
