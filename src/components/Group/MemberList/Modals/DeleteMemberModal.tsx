import React, { useState } from 'react';
import { Modal, Button, Alert, message } from 'antd';
import { GroupServices } from '@/services/Group';
import type { KickMembersRequest } from '@/services/Group';
import { useMemberEditGuard } from './useMemberEditGuard';
import type { DeleteMemberModalProps } from './index.type';
import { toNumberIds } from '@/utils/number';
import SelectedMemberList from '@/components/Common/SelectedMemberList';

const DeleteMemberModal: React.FC<DeleteMemberModalProps> = ({
  open,
  onCancel,
  onSuccess,
  memberIds,
  members,
  groupId,
  permissionConfig,
}) => {
  const [loading, setLoading] = useState(false);

  const { memberContainsOwner, canEdit, confirmDisabled } = useMemberEditGuard(
    members,
    permissionConfig.editableRoles,
    { checkOwner: true }
  );

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const params: KickMembersRequest = {
        groupId: toNumberIds(groupId),
        targetUserIds: memberIds,
      };
      await GroupServices.kickMembers(params);
      message.success(`已删除 ${memberIds.length} 位成员`);
      onSuccess?.();
      onCancel();
    } catch (error) {
      console.error('删除成员失败:', error);
      message.error('删除成员失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="删除成员"
      open={open}
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
          disabled={confirmDisabled}
          loading={loading}
        >
          删除
        </Button>,
      ]}
      width={500}
    >
      {memberContainsOwner ? (
        <Alert description="选中成员中有小组创建者，不可删除！" type="error" showIcon />
      ) : !canEdit ? (
        <Alert description={'您不能删除组长/管理员。'} type="error" showIcon />
      ) : (
        <Alert description="确定要删除以下成员吗？此操作不可撤销！" type="warning" showIcon />
      )}
      <SelectedMemberList members={members} />
    </Modal>
  );
};

export default DeleteMemberModal;
