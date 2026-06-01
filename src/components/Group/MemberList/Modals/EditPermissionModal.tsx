import SelectedMemberList from '@/components/Common/SelectedMemberList';
import { useGroupService } from '@/domains';
import { ROLE } from '@/domains/Group';
import type { EnumKey } from '@/utils/enum';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Alert, Modal, Select } from 'antd';
import { useState } from 'react';
import type { EditPermissionModalProps } from './index.type';
import styles from './style.module.less';
import { useMemberEditGuard } from './useMemberEditGuard';

const { Option } = Select;

function EditPermissionModal({
  open,
  onCancel,
  onSuccess,
  groupId,
  memberIds,
  members,
  groupDisplayConfig,
}: EditPermissionModalProps) {
  const groupService = useGroupService();
  const [selectedPermission, setSelectedPermission] = useState<EnumKey<typeof ROLE>>('MEMBER');
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
        toast.success(`已修改 ${memberIds.length} 位成员的权限`);
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
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
    const role = ROLE[selectedPermission] ?? ROLE.MEMBER;
    runUpdatePermission(role);
  };

  return (
    <Modal
      title="修改权限"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onPress={onCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          variant="primary"
          onPress={handleConfirm}
          isDisabled={confirmDisabled || loading}
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
            onChange={(value) => setSelectedPermission(value as EnumKey<typeof ROLE>)}
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
}

export default EditPermissionModal;
