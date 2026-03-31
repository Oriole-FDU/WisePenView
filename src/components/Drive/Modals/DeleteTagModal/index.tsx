import React, { useState } from 'react';
import { Modal, Button, Alert } from 'antd';
import { useRequest } from 'ahooks';
import { useTagService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { DeleteTagModalProps } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';

const DeleteTagModal: React.FC<DeleteTagModalProps> = ({
  open,
  onCancel,
  onSuccess,
  tag,
  groupId,
}) => {
  const tagService = useTagService();
  const message = useAppMessage();
  const { loading, run: runDeleteTag } = useRequest(
    async () =>
      tagService.deleteTag({
        groupId: tag!.groupId ?? groupId,
        targetTagId: tag!.tagId!,
      }),
    {
      manual: true,
      onSuccess: () => {
        message.success('标签已删除');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '删除失败'));
      },
    }
  );

  const handleConfirm = async () => {
    if (!tag?.tagId) return;
    runDeleteTag();
  };

  const displayName = tag?.tagName || '未命名';

  return (
    <Modal
      title="删除标签"
      open={open && !!tag}
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
        description={`确定要删除标签「${displayName}」及其子标签吗？此操作不可撤销！（文件会失去标签，不会丢失）`}
        type="warning"
        showIcon
      />
    </Modal>
  );
};

export default DeleteTagModal;
