import React, { useState } from 'react';
import { Modal, Button, Alert } from 'antd';
import { useRequest } from 'ahooks';
import { useDocumentService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { useRecentFilesStore } from '@/store';
import type { DeleteFileModalProps } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';
import { RESOURCE_TYPE } from '@/constants/resource';

const DeleteFileModal: React.FC<DeleteFileModalProps> = ({ open, onCancel, onSuccess, file }) => {
  const documentService = useDocumentService();
  const message = useAppMessage();
  const removeFile = useRecentFilesStore((s) => s.removeFile);

  const { loading, run: runDeleteFile } = useRequest(
    async () => documentService.deleteDocument(file!.resourceId!),
    {
      manual: true,
      onSuccess: () => {
        removeFile(file!.resourceId!);
        message.success('文件已删除');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '删除失败'));
      },
    }
  );

  const handleConfirm = async () => {
    if (!file?.resourceId) return;
    if (file.resourceType === RESOURCE_TYPE.NOTE) {
      message.warning('暂不支持删除笔记');
      return;
    }
    runDeleteFile();
  };

  const displayName = file?.resourceName || '未命名';

  return (
    <Modal
      title="删除文件"
      open={open && !!file}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="confirm" danger type="primary" onClick={handleConfirm} loading={loading}>
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
