import React, { useCallback, useState } from 'react';
import { Modal, Button, Input } from 'antd';
import { useRequest } from 'ahooks';
import { useTagService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { NewTagModalProps } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';

import styles from './index.module.less';

const NewTagModal: React.FC<NewTagModalProps> = ({
  open,
  onCancel,
  onSuccess,
  groupId,
  parentTagId,
  parentDisplayName,
}) => {
  const tagService = useTagService();
  const message = useAppMessage();
  const [name, setName] = useState('');
  const { loading, run: runAddTag } = useRequest(
    async (trimmed: string) =>
      tagService.addTag({
        groupId,
        ...(parentTagId ? { parentId: parentTagId } : {}),
        tagName: trimmed,
      }),
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

  const handleOpenChange = useCallback((visible: boolean) => {
    if (visible) {
      setName('');
    }
  }, []);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      message.warning('请输入标签名称');
      return;
    }
    runAddTag(trimmed);
  };

  const handleCancel = () => {
    setName('');
    onCancel();
  };

  const pathHint = parentTagId
    ? `将在「${parentDisplayName ?? '当前标签'}」下创建子标签`
    : '将创建顶级标签';

  return (
    <Modal
      title="新建标签"
      open={open}
      onCancel={handleCancel}
      afterOpenChange={handleOpenChange}
      destroyOnHidden
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
      <div className={styles.pathHint}>{pathHint}</div>
      <Input
        placeholder="请输入标签名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={handleSubmit}
        autoFocus
        className={styles.input}
      />
    </Modal>
  );
};

export default NewTagModal;
