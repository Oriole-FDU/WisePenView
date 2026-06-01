import { useDriveService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, Modal, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { DeleteNodeModalProps } from './index.type';

function getNodeName(node: DeleteNodeModalProps['node']): string {
  if (!node) return '未命名';
  if (node.type === 'folder') return node.name;
  return node.title;
}

function DeleteNodeModal({ isOpen, node, groupId, onOpenChange, onSuccess }: DeleteNodeModalProps) {
  const driveService = useDriveService();
  const { loading, run: runDeleteNode } = useRequest(
    async () => {
      if (!node) return;
      await driveService.removeNode({ nodeId: node.id, groupId });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('删除成功');
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleConfirm = () => {
    if (!node) return;
    runDeleteNode();
  };

  const isFolder = node?.type === 'folder';
  const title = isFolder ? '删除文件夹' : '删除文件';
  const description = isFolder
    ? `确定删除「${getNodeName(node)}」及其下属内容吗？此操作不可撤销。`
    : `确定删除「${getNodeName(node)}」吗？此操作不可撤销。`;

  return (
    <Modal isOpen={isOpen && !!node} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="rounded-medium bg-danger/10 px-4 py-3 text-sm text-danger">
                {description}
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

export default DeleteNodeModal;
