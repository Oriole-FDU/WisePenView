import { useStickerService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { validateReservedName } from '@/utils/tag/validateReservedName';
import { Button, Input, Modal, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useCallback, useState } from 'react';
import type { AddStickerModalProps } from './index.type';

function AddStickerModal({ isOpen, onOpenChange, onSuccess }: AddStickerModalProps) {
  const stickerService = useStickerService();
  const [name, setName] = useState('');
  const reset = useCallback(() => {
    setName('');
  }, []);

  const handleCancel = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const { loading, run: runAddSticker } = useRequest(
    async (trimmed: string) => stickerService.addSticker({ stickerName: trimmed }),
    {
      manual: true,
      onSuccess: () => {
        onSuccess?.();
        reset();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleOk = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const validation = validateReservedName(trimmed);
    if (!validation.valid) {
      toast.warning(validation.reason);
      return;
    }
    runAddSticker(trimmed);
  }, [name, runAddSticker]);

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>新增标签</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <TextField aria-label="标签名称" value={name} autoFocus onChange={setName}>
                <Input
                  placeholder="请输入标签名称"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleOk();
                    }
                  }}
                />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleCancel} isDisabled={loading}>
                取消
              </Button>
              <Button
                variant="primary"
                onPress={() => void handleOk()}
                isDisabled={!name.trim() || loading}
              >
                确定
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default AddStickerModal;
