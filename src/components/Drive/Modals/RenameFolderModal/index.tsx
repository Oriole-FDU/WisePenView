import React, { useCallback, useState } from 'react';
import { Modal, Button, Input } from 'antd';
import { useRequest } from 'ahooks';
import { useFolderService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { getFolderDisplayName } from '@/utils/path';
import type { RenameFolderModalProps } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';

const RenameFolderModal: React.FC<RenameFolderModalProps> = ({
  open,
  onCancel,
  onSuccess,
  folder,
}) => {
  const folderService = useFolderService();
  const message = useAppMessage();
  const [name, setName] = useState('');

  const handleOpenChange = useCallback(
    (visible: boolean) => {
      if (visible && folder) {
        setName(getFolderDisplayName(folder.tagName ?? ''));
      }
    },
    [folder]
  );

  const { loading, run: runRenameFolder } = useRequest(
    async (trimmed: string) => folderService.renameFolder(folder!, trimmed),
    {
      manual: true,
      onSuccess: () => {
        message.success('重命名成功');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '重命名失败'));
      },
    }
  );

  const handleSubmit = async () => {
    if (!folder) return;
    const trimmed = name.trim();
    if (!trimmed) {
      message.warning('请输入文件夹名称');
      return;
    }
    await runRenameFolder(trimmed);
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
      afterOpenChange={handleOpenChange}
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

export default RenameFolderModal;
