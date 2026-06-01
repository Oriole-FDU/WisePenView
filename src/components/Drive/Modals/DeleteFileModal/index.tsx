import { useDocumentService, useNoteService } from '@/domains';
import { RESOURCE_TYPE } from '@/domains/Resource';
import { useNewNoteStore, usePdfPreviewProgressStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { Button, Modal, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { DeleteFileModalProps } from './index.type';

function DeleteFileModal({ isOpen, onOpenChange, onSuccess, file }: DeleteFileModalProps) {
  const documentService = useDocumentService();
  const noteService = useNoteService();
  const { loading, run: runDeleteFile } = useRequest(
    async () => {
      const resourceId = file!.resourceId!;
      if (file!.resourceType === RESOURCE_TYPE.NOTE) {
        await noteService.deleteNote({ resourceIds: [resourceId] });
        return resourceId;
      }
      await documentService.deleteDocument(resourceId);
      return resourceId;
    },
    {
      manual: true,
      onSuccess: (deletedResourceId) => {
        if (deletedResourceId) {
          // 资源已删除，同步清理与之绑定的临时状态
          usePdfPreviewProgressStore.getState().removeProgress(deletedResourceId);
          useNewNoteStore.getState().clearNewNoteResourceId(deletedResourceId);
        }
        toast.success('文件已删除');
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleConfirm = async () => {
    if (!file?.resourceId) return;
    runDeleteFile();
  };

  const displayName = file?.resourceName || '未命名';

  return (
    <Modal isOpen={isOpen && !!file} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>删除文件</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="rounded-medium bg-danger/10 px-4 py-3 text-sm text-danger">
                {`确定要删除「${displayName}」吗？此操作不可撤销！`}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={loading} onPress={() => onOpenChange(false)}>
                取消
              </Button>
              <Button variant="danger" isDisabled={loading} onPress={() => void handleConfirm()}>
                删除
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default DeleteFileModal;
