import React, { useState } from 'react';
import { Modal, Button, Alert } from 'antd';
import { useRequest } from 'ahooks';
import { useGroupService } from '@/contexts/ServicesContext';
import type { KickMembersRequest } from '@/services/Group';
import { useMemberEditGuard } from './useMemberEditGuard';
import type { DeleteMemberModalProps } from './index.type';
import SelectedMemberList from '@/components/Common/SelectedMemberList';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/parseErrorMessage';

const DeleteMemberModal: React.FC<DeleteMemberModalProps> = ({
  open,
  onCancel,
  onSuccess,
  memberIds,
  members,
  groupId,
  groupDisplayConfig,
}) => {
  const groupService = useGroupService();
  const message = useAppMessage();
  const { loading, run: runDeleteMembers } = useRequest(
    async () =>
      groupService.kickMembers({
        groupId,
        targetUserIds: memberIds,
      }),
    {
      manual: true,
      onSuccess: () => {
        message.success(`已删除 ${memberIds.length} 位成员`);
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '删除成员失败'));
      },
    }
  );

  const { memberContainsOwner, canEdit, confirmDisabled } = useMemberEditGuard(
    members,
    groupDisplayConfig.editableRoles,
    { checkOwner: true }
  );

  const handleConfirm = () => {
    runDeleteMembers();
  };

  return (
    <Modal
      title="删除成员"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
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
