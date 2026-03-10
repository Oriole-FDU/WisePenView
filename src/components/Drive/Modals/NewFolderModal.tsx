import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, message } from 'antd';
import { FolderServices } from '@/services/Folder';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { NewFolderModalProps } from './index.type';
import { getFolderDisplayName } from '@/utils/path';

const NewFolderModal: React.FC<NewFolderModalProps> = ({
  open,
  onCancel,
  onSuccess,
  parentPath,
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      message.warning('请输入文件夹名称');
      return;
    }
    try {
      setLoading(true);
      await FolderServices.createFolder(parentPath, trimmed);
      message.success('新建成功');
      onSuccess?.();
      onCancel();
    } catch (err) {
      message.error(parseErrorMessage(err, '新建失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName('');
    onCancel();
  };

  const displayPath =
    parentPath === '/' || !parentPath ? '~' : getFolderDisplayName(parentPath);

  return (
    <Modal
      title="新建文件夹"
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleSubmit} loading={loading}>
          创建
        </Button>,
      ]}
      width={400}
    >
      <div style={{ marginBottom: 8, color: 'var(--ant-color-text-secondary)', fontSize: 12 }}>
        位置：{displayPath}
      </div>
      <Input
        placeholder="请输入文件夹名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={handleSubmit}
        autoFocus
      />
    </Modal>
  );
};

export default NewFolderModal;
