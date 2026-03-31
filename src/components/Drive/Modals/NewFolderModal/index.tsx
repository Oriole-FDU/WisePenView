import React, { useCallback, useState } from 'react';
import { useRequest } from 'ahooks';
import { Modal, Button, Input } from 'antd';
import { useFolderService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { getFolderDisplayName } from '@/utils/path';
import type { NewFolderModalProps } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';

import styles from './index.module.less';

const NewFolderModal: React.FC<NewFolderModalProps> = ({
  open,
  onCancel,
  onSuccess,
  parentFolder,
}) => {
  const folderService = useFolderService();
  const message = useAppMessage();
  const [name, setName] = useState('');

  const handleOpenChange = useCallback((visible: boolean) => {
    if (visible) {
      setName('');
    }
  }, []);

  const { loading, run: runCreateFolder } = useRequest(
    async (trimmed: string) => folderService.createFolder(parentFolder!, trimmed),
    {
      manual: true,
      onSuccess: () => {
        message.success('新建成功');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '新建失败'));
      },
    }
  );

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      message.warning('请输入文件夹名称');
      return;
    }
    if (!parentFolder) {
      message.warning('当前目录未就绪，请关闭后重试');
      return;
    }
    await runCreateFolder(trimmed);
  };

  const handleCancel = () => {
    setName('');
    onCancel();
  };

  return (
    <Modal
      title="新建文件夹"
      open={open}
      onCancel={handleCancel}
      afterOpenChange={handleOpenChange}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleSubmit}
          loading={loading}
          disabled={!parentFolder}
        >
          创建
        </Button>,
      ]}
      width={420}
    >
      <div className={styles.pathHint}>
        {parentFolder
          ? `将在「${getFolderDisplayName(parentFolder.tagName)}」下创建`
          : '当前目录未就绪'}
      </div>
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
