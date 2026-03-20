import React, { useState } from 'react';
import { Modal, Button, Select, Alert } from 'antd';
import { useGroupService } from '@/contexts/ServicesContext';
import type { UpdateMemberRoleRequest } from '@/services/Group';
import { useMemberEditGuard } from './useMemberEditGuard';
import type { EditPermissionModalProps } from './index.type';
import { ROLE_MAP } from '@/types/group';
import SelectedMemberList from '@/components/Common/SelectedMemberList';
import styles from './style.module.less';
import { useAppMessage } from '@/hooks/useAppMessage';

const { Option } = Select;

const EditPermissionModal: React.FC<EditPermissionModalProps> = ({
  open,
  onCancel,
  onSuccess,
  groupId,
  memberIds,
  members,
  permissionConfig,
}) => {
  const groupService = useGroupService();
  const message = useAppMessage();
  const [selectedPermission, setSelectedPermission] = useState<string>('MEMBER');
  const [loading, setLoading] = useState(false);

  const { memberContainsOwner, canEdit, confirmDisabled } = useMemberEditGuard(
    members,
    permissionConfig.editableRoles,
    { checkOwner: true }
  );
  const canPromoteToAdmin = permissionConfig.canModifyPermission;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const role = ROLE_MAP[selectedPermission] ?? 3;
      const params: UpdateMemberRoleRequest = {
        groupId,
        targetUserIds: memberIds,
        role,
      };
      await groupService.updateMemberRole(params);
      message.success(`已修改 ${memberIds.length} 位成员的权限`);
      onSuccess?.();
      onCancel();
    } catch (error) {
      console.error('修改权限失败:', error);
      message.error('修改权限失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="修改权限"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          disabled={confirmDisabled}
          loading={loading}
        >
          确定
        </Button>,
      ]}
      width={500}
    >
      {memberContainsOwner ? (
        <Alert description="选中成员中有小组创建者，不可修改权限！" type="error" showIcon />
      ) : !canEdit ? (
        <Alert description={'您不能编辑组长/管理员的权限。'} type="error" showIcon />
      ) : (
        <div className={styles.permissionRow}>
          <label className={styles.permissionLabel}>将以下成员的权限设置为</label>
          <Select
            value={selectedPermission}
            onChange={setSelectedPermission}
            className={styles.fullWidth}
          >
            {canPromoteToAdmin && <Option value="ADMIN">管理员</Option>}
            <Option value="MEMBER">成员</Option>
          </Select>
        </div>
      )}
      <SelectedMemberList members={members} />
    </Modal>
  );
};

export default EditPermissionModal;
