import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Input, message } from 'antd';
import { useFolderService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { Folder } from '@/types/folder';
import type { ResourceItem } from '@/types/resource';
import type { NewFolderModalProps } from './index.type';
import TreeNav from '@/components/Common/TreeNav';

import styles from './index.module.less';

const NewFolderModal: React.FC<NewFolderModalProps> = ({
  open,
  onCancel,
  onSuccess,
  parentPath,
}) => {
  const folderService = useFolderService();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedParentPath, setSelectedParentPath] = useState(parentPath ?? '/');

  useEffect(() => {
    if (open) {
      setName('');
      setSelectedParentPath(parentPath ?? '/');
    }
  }, [open, parentPath]);

  const handleFolderSelect = useCallback(
    (item: { type: 'file'; data: ResourceItem } | { type: 'folder'; data: Folder }) => {
      if (item.type === 'folder') {
        setSelectedParentPath(item.data.tagName ?? '/');
      }
    },
    []
  );

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      message.warning('请输入文件夹名称');
      return;
    }
    try {
      setLoading(true);
      await folderService.createFolder(selectedParentPath, trimmed);
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

  const displayPath = `~${selectedParentPath || '/'}`;

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
      width={420}
    >
      <div className={styles.pathHint}>选择路径：</div>
      <div className={styles.treeWrap}>
        <TreeNav
          mode="folder"
          embedMode
          defaultSelectedKey={selectedParentPath}
          onSelect={handleFolderSelect}
          className={styles.treeNav}
        />
      </div>
      <div className={styles.pathHint}>当前路径：{displayPath}</div>
      <Input
        placeholder="请输入文件夹名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={handleSubmit}
        autoFocus
        className={styles.input}
      />
    </Modal>
  );
};

export default NewFolderModal;
