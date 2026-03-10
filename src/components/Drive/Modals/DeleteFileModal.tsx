import React, { useState } from 'react';
import { Modal, Button, Alert, message } from 'antd';
import { ResourceServices } from '@/services/Resource';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { DeleteFileModalProps } from './index.type';

const DeleteFileModal: React.FC<DeleteFileModalProps> = ({
  open,
  onCancel,
  onSuccess,
  file,
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!file) return;
    try {
      setLoading(true);
      await ResourceServices.deleteResource(file.resourceId);
      message.success('文件已删除');
      onSuccess?.();
      onCancel();
    } catch (err) {
      message.error(parseErrorMessage(err, '删除失败'));
    } finally {
      setLoading(false);
    }
  };

  const displayName = file?.resourceName || '未命名';

  return (
    <Modal
      title="删除文件"
      open={open && !!file}
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
        description={`确定要删除「${displayName}」吗？此操作不可撤销！`}
        type="warning"
        showIcon
      />
    </Modal>
  );
};

export default DeleteFileModal;
