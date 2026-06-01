import { useDriveService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { validateReservedName } from '@/utils/tag/validateReservedName';
import { Button, Input, Modal, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import type { NewFolderNodeModalProps } from './index.type';
import styles from './style.module.less';

function NewFolderNodeModal({
  isOpen,
  parentId,
  groupId,
  parentLabel,
  existingFolderNames = [],
  onOpenChange,
  onSuccess,
}: NewFolderNodeModalProps) {
  const driveService = useDriveService();
  const [name, setName] = useState('');

  const { loading, run: runCreateFolder } = useRequest(
    async (trimmed: string) =>
      driveService.createNode({ parentId, name: trimmed, type: 'folder', groupId }),
    {
      manual: true,
      onSuccess: () => {
        toast.success('新建成功');
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.warning('请输入文件夹名称');
      return;
    }
    const validation = validateReservedName(trimmed);
    if (!validation.valid) {
      toast.warning(validation.reason);
      return;
    }
    if (existingFolderNames.includes(trimmed)) {
      toast.warning('当前目录下已存在同名文件夹');
      return;
    }
    runCreateFolder(trimmed);
  };

  const handleCancel = () => {
    setName('');
    onOpenChange(false);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>新建文件夹</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className={styles.pathHint}>
                {parentLabel ? `创建到「${parentLabel}」下` : '当前目录'}
              </div>
              <TextField
                aria-label="文件夹名称"
                className={styles.input}
                value={name}
                autoFocus
                onChange={setName}
              >
                <Input
                  placeholder="请输入文件夹名称"
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
              <Button variant="secondary" onPress={handleCancel} isDisabled={loading}>
                取消
              </Button>
              <Button variant="primary" onPress={handleSubmit} isDisabled={loading}>
                创建
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default NewFolderNodeModal;
