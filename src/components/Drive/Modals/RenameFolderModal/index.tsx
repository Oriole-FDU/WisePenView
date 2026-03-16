import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, message } from 'antd';
import { useFolderService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { getFolderDisplayName } from '@/utils/path';
import type { RenameFolderModalProps } from './index.type';

const RenameFolderModal: React.FC<RenameFolderModalProps> = ({
  open,
  onCancel,
  onSuccess,
  folder,
}) => {
  const folderService = useFolderService();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && folder) {
      setName(getFolderDisplayName(folder.tagName ?? ''));
    }
  }, [open, folder]);

  const handleSubmit = async () => {
    if (!folder) return;
    const trimmed = name.trim();
    if (!trimmed) {
      message.warning('请输入文件夹名称');
      return;
    }
    try {
      setLoading(true);
      await folderService.renameFolder(folder, trimmed);
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
      title="重命名文件夹"
      open={open && !!folder}
      onCancel={handleCancel}
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

export default RenameFolderModal;
