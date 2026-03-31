import React, { useState } from 'react';
import { Modal, Button, Select, Alert } from 'antd';
import { useRequest } from 'ahooks';
import { useGroupService } from '@/contexts/ServicesContext';
import type { UpdateMemberRoleRequest } from '@/services/Group';
import { useMemberEditGuard } from './useMemberEditGuard';
import type { EditPermissionModalProps } from './index.type';
import { ROLE_MAP } from '@/constants/group';
import SelectedMemberList from '@/components/Common/SelectedMemberList';
import styles from './style.module.less';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/parseErrorMessage';

const { Option } = Select;

const EditPermissionModal: React.FC<EditPermissionModalProps> = ({
  open,
  onCancel,
  onSuccess,
  groupId,
  memberIds,
  members,
  groupDisplayConfig,
}) => {
  const groupService = useGroupService();
  const message = useAppMessage();
  const [selectedPermission, setSelectedPermission] = useState<string>('MEMBER');
  const { loading, run: runUpdatePermission } = useRequest(
    async (role: number) =>
      groupService.updateMemberRole({
        groupId,
        targetUserIds: memberIds,
        role,
      }),
    {
      manual: true,
      onSuccess: () => {
        message.success(`已修改 ${memberIds.length} 位成员的权限`);
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '修改权限失败'));
      },
    }
  );

  const { memberContainsOwner, canEdit, confirmDisabled } = useMemberEditGuard(
    members,
    groupDisplayConfig.editableRoles,
    { checkOwner: true }
  );
  const canPromoteToAdmin = groupDisplayConfig.canModifyPermission;

  const handleConfirm = () => {
    const role = ROLE_MAP[selectedPermission] ?? ROLE_MAP['MEMBER'];
    runUpdatePermission(role);
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
