import React, { useState } from 'react';
import { Modal, Button, Alert, message } from 'antd';
import { FolderServices } from '@/services/Folder';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { getFolderDisplayName } from '@/utils/path';
import type { DeleteFolderModalProps } from './index.type';

const DeleteFolderModal: React.FC<DeleteFolderModalProps> = ({
  open,
  onCancel,
  onSuccess,
  folder,
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!folder) return;
    try {
      setLoading(true);
      await FolderServices.deleteFolder(folder);
      message.success('文件夹已删除');
      onSuccess?.();
      onCancel();
    } catch (err) {
      message.error(parseErrorMessage(err, '删除失败'));
    } finally {
      setLoading(false);
    }
  };

  const displayName = folder ? getFolderDisplayName(folder.tagName ?? '') : '';

  return (
    <Modal
      title="删除文件夹"
      open={open && !!folder}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          danger
          type="primary"
          onClick={handleConfirm}
          loading={loading}
        >
          删除
        </Button>,
      ]}
      width={500}
    >
      <Alert
        description={`确定要删除「${displayName}」吗？将同时删除其下的所有子文件夹和文件，此操作不可撤销！`}
        type="warning"
        showIcon
      />
    </Modal>
  );
};

export default DeleteFolderModal;
