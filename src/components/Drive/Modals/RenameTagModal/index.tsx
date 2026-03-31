import React, { useCallback, useState } from 'react';
import { Modal, Button, Input } from 'antd';
import { useRequest } from 'ahooks';
import { useTagService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { RenameTagModalProps } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';

const RenameTagModal: React.FC<RenameTagModalProps> = ({
  open,
  onCancel,
  onSuccess,
  tag,
  groupId,
}) => {
  const tagService = useTagService();
  const message = useAppMessage();
  const [name, setName] = useState('');
  const { loading, run: runUpdateTag } = useRequest(
    async (trimmed: string) =>
      tagService.updateTag({
        groupId: tag!.groupId ?? groupId,
        targetTagId: tag!.tagId!,
        tagName: trimmed,
      }),
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

  const handleOpenChange = useCallback(
    (visible: boolean) => {
      if (visible && tag) {
        setName(tag.tagName ?? '');
      }
    },
    [tag]
  );

  const handleSubmit = async () => {
    if (!tag?.tagId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      message.warning('请输入标签名称');
      return;
    }
    runUpdateTag(trimmed);
  };

  const handleCancel = () => {
    setName('');
    onCancel();
  };

  return (
    <Modal
      title="重命名标签"
      open={open && !!tag}
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

export default RenameTagModal;
