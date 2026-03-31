import React, { useCallback, useState } from 'react';
import { Modal, Input } from 'antd';
import { useRequest } from 'ahooks';
import { useStickerService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { AddStickerModalProps } from './index.type';

const AddStickerModal: React.FC<AddStickerModalProps> = ({ open, onCancel, onSuccess }) => {
  const stickerService = useStickerService();
  const message = useAppMessage();

  const [name, setName] = useState('');
  const reset = useCallback(() => {
    setName('');
  }, []);

  const handleCancel = useCallback(() => {
    reset();
    onCancel();
  }, [reset, onCancel]);

  const { loading, run: runAddSticker } = useRequest(
    async (trimmed: string) => stickerService.addSticker({ stickerName: trimmed }),
    {
      manual: true,
      onSuccess: () => {
        onSuccess?.();
        reset();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '新增标签失败'));
      },
    }
  );

  const handleOk = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    runAddSticker(trimmed);
  }, [name, runAddSticker]);

  return (
    <Modal
      title="新增标签"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okButtonProps={{ disabled: !name.trim() }}
      destroyOnHidden
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={handleOk}
        placeholder="请输入标签名称"
        autoFocus
      />
    </Modal>
  );
};

export default AddStickerModal;
