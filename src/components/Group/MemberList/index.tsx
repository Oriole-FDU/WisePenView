import React, { useState, useMemo } from 'react';
import type { GroupMember } from '@/types/group';
import type { MemberListProps } from './index.type';
import { toNumberIds } from '@/utils/number';
import MemberListToolbar from './MemberListToolbar';
import MemberListTable from './MemberListTable';
import {
  InviteUserModal,
  EditPermissionModal,
  DeleteMemberModal,
  AssignQuotaModal,
} from './Modals';
import styles from './style.module.less';

const MemberList: React.FC<MemberListProps> = ({
  permissionConfig,
  pagination,
  groupId,
  inviteCode,
  mockMembers,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [selectedMembersList, setSelectedMembersList] = useState<GroupMember[]>([]);
  const [total, setTotal] = useState(0);
  const [activeModal, setActiveModal] = useState<
    'invite' | 'editPermission' | 'deleteMember' | 'assignQuota' | null
  >(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const clearSelectedMembers = () => {
    setSelectedRowKeys([]);
    setSelectedMembersList([]);
  };

  const handleToggleEditMode = () => {
    if (isEditMode) clearSelectedMembers();
    setIsEditMode(!isEditMode);
  };

  const onCancelModal = () => {
    setActiveModal(null);
  };

  const onSuccessModal = () => {
    setActiveModal(null);
    clearSelectedMembers();
    setRefreshTrigger((t) => t + 1);
  };

  const handleEdit = (action: 'editPermission' | 'assignQuota' | 'deleteMember') => {
    setActiveModal(action);
  };

  const selectedMemberIds = useMemo(() => toNumberIds(selectedRowKeys), [selectedRowKeys]);

  return (
    <div>
      <MemberListToolbar
        isEditMode={isEditMode}
        total={total}
        permissionConfig={permissionConfig}
        selectedCount={selectedRowKeys.length}
        onModifyPermission={() => handleEdit('editPermission')}
        onAssignQuota={() => handleEdit('assignQuota')}
        onDelete={() => handleEdit('deleteMember')}
        onToggleEditMode={handleToggleEditMode}
        onInviteUser={() => setActiveModal('invite')}
      />

      <MemberListTable
        groupId={groupId}
        permissionConfig={permissionConfig}
        pagination={pagination}
        isEditMode={isEditMode}
        selectedRowKeys={selectedRowKeys}
        onSelectedRowKeysChange={setSelectedRowKeys}
        onSelectedMembersChange={setSelectedMembersList}
        onTotalChange={setTotal}
        refreshTrigger={refreshTrigger}
        mockMembers={mockMembers}
      />

      <InviteUserModal
        open={activeModal === 'invite'}
        onCancel={onCancelModal}
        inviteCode={inviteCode}
      />

      <EditPermissionModal
        open={activeModal === 'editPermission'}
        onCancel={onCancelModal}
        groupId={groupId}
        memberIds={selectedMemberIds}
        members={selectedMembersList}
        permissionConfig={permissionConfig}
        onSuccess={onSuccessModal}
      />

      <DeleteMemberModal
        open={activeModal === 'deleteMember'}
        onCancel={onCancelModal}
        memberIds={selectedMemberIds}
        members={selectedMembersList}
        onSuccess={onSuccessModal}
        groupId={groupId}
        permissionConfig={permissionConfig}
      />

      <AssignQuotaModal
        open={activeModal === 'assignQuota'}
        onCancel={onCancelModal}
        groupId={groupId}
        memberIds={selectedMemberIds}
        members={selectedMembersList}
        permissionConfig={permissionConfig}
        onSuccess={onSuccessModal}
      />
    </div>
  );
};

export default MemberList;
