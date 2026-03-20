import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from 'antd';
import { useResourceService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { useRecentFilesStore } from '@/store';
import type { RenameFileModalProps } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';

const RenameFileModal: React.FC<RenameFileModalProps> = ({ open, onCancel, onSuccess, file }) => {
  const resourceService = useResourceService();
  const message = useAppMessage();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const updateFileName = useRecentFilesStore((s) => s.updateFileName);

  useEffect(() => {
    if (open && file) {
      setName(file.resourceName || '');
    }
  }, [open, file]);

  const handleSubmit = async () => {
    if (!file?.resourceId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      message.warning('请输入文件名称');
      return;
    }
    try {
      setLoading(true);
      await resourceService.renameResource({
        resourceId: file.resourceId,
        newName: trimmed,
      });
      updateFileName(file.resourceId, trimmed);
      message.success('重命名成功');
      onSuccess?.();
      onCancel();
    } catch (err) {
      message.error(parseErrorMessage(err, '重命名失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName('');
    onCancel();
  };

  return (
    <Modal
      title="重命名文件"
      open={open && !!file}
      onCancel={handleCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleSubmit} loading={loading}>
          确定
        </Button>,
      ]}
      width={400}
    >
      <Input
        placeholder="请输入新名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={handleSubmit}
        autoFocus
      />
    </Modal>
  );
};

export default RenameFileModal;
