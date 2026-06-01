import { useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, Input, Modal, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import type { RenameFileModalProps } from './index.type';

function RenameFileModal({ isOpen, onOpenChange, onSuccess, file }: RenameFileModalProps) {
  const resourceService = useResourceService();
  const [name, setName] = useState(file?.resourceName || '');

  const { loading, run: runRenameFile } = useRequest(
    async (trimmed: string) =>
      resourceService.renameResource({
        resourceId: file!.resourceId!,
        newName: trimmed,
      }),
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
    if (!file?.resourceId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.warning('请输入文件名称');
      return;
    }
    runRenameFile(trimmed);
  };

  const handleCancel = () => {
    setName('');
    onOpenChange(false);
  };

  return (
    <Modal isOpen={isOpen && !!file} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>重命名文件</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <TextField aria-label="文件名称" value={name} autoFocus onChange={setName}>
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
              <Button variant="secondary" onPress={handleCancel} isDisabled={loading}>
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

export default RenameFileModal;
