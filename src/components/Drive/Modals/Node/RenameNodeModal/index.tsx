import { useDriveService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, Input, Modal, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import type { DriveActionTarget } from '../../../common/driveComponentModel';
import type { RenameNodeModalProps } from './index.type';
import styles from './style.module.less';

function getDefaultName(node: DriveActionTarget | null): string {
  if (!node) return '';
  if (node.type === 'folder') return node.name;
  return node.title;
}

function RenameNodeModal({ isOpen, node, groupId, onOpenChange, onSuccess }: RenameNodeModalProps) {
  const driveService = useDriveService();
  const [name, setName] = useState(getDefaultName(node));

  const { loading, run: runRenameNode } = useRequest(
    async (trimmed: string) => {
      if (!node) return;
      await driveService.renameNode({ nodeId: node.id, newName: trimmed, groupId });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('重命名成功');
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = () => {
    if (!node) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.warning('请输入名称');
      return;
    }
    runRenameNode(trimmed);
  };

  const title = node?.type === 'folder' ? '重命名文件夹' : '重命名文件';

  return (
    <Modal isOpen={isOpen && !!node} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <TextField
                aria-label="节点名称"
                className={styles.input}
                value={name}
                autoFocus
                onChange={setName}
              >
                <Input
                  placeholder="请输入新名称"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => onOpenChange(false)} isDisabled={loading}>
                取消
              </Button>
              <Button variant="primary" onPress={handleSubmit} isDisabled={loading}>
                确定
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default RenameNodeModal;
