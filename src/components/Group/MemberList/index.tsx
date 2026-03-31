import React, { useState, useMemo } from 'react';
import { usePagination } from 'ahooks';
import type { GroupMember } from '@/types/group';
import type { MemberListProps } from './index.type';
import { toIdString } from '@/utils/number';
import MemberListToolbar from './MemberListToolbar';
import MemberListTable from './MemberListTable';
import {
  InviteUserModal,
  EditPermissionModal,
  DeleteMemberModal,
  AssignQuotaModal,
} from './Modals';
import styles from './style.module.less';
import { useGroupService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';

const MemberList: React.FC<MemberListProps> = ({
  groupDisplayConfig,
  pagination,
  groupId,
  inviteCode,
}) => {
  const groupService = useGroupService();
  const message = useAppMessage();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [selectedMembersList, setSelectedMembersList] = useState<GroupMember[]>([]);
  const [activeModal, setActiveModal] = useState<
    'invite' | 'editPermission' | 'deleteMember' | 'assignQuota' | null
  >(null);

  const defaultPageSize = pagination?.defaultPageSize ?? 5;
  const {
    data: membersData,
    loading,
    refresh,
    pagination: { current: currentPage = 1, pageSize = defaultPageSize, onChange: onPageChange },
  } = usePagination(
    async ({ current, pageSize: nextPageSize }) => {
      const { members, total } = await groupService.fetchGroupMembers(
        groupId,
        current,
        nextPageSize
      );
      return { list: members, total };
    },
    {
      defaultCurrent: 1,
      defaultPageSize,
      refreshDeps: [groupId],
      onError: () => {
        message.error('获取成员列表失败');
      },
    }
  );

  const members = membersData?.list ?? [];
  const total = membersData?.total ?? 0;

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
    void refresh();
  };

  const handleEdit = (action: 'editPermission' | 'assignQuota' | 'deleteMember') => {
    setActiveModal(action);
  };

  const selectedMemberIds = useMemo(
    () => selectedRowKeys.map((k) => toIdString(k)),
    [selectedRowKeys]
  );

  return (
    <div>
      <MemberListToolbar
        isEditMode={isEditMode}
        total={total}
        groupDisplayConfig={groupDisplayConfig}
        selectedCount={selectedRowKeys.length}
        onModifyPermission={() => handleEdit('editPermission')}
        onAssignQuota={() => handleEdit('assignQuota')}
        onDelete={() => handleEdit('deleteMember')}
        onToggleEditMode={handleToggleEditMode}
        onInviteUser={() => setActiveModal('invite')}
      />

      <MemberListTable
        groupDisplayConfig={groupDisplayConfig}
        pagination={pagination}
        members={members}
        loading={loading}
        total={total}
        currentPage={currentPage}
        pageSize={pageSize}
        isEditMode={isEditMode}
        selectedRowKeys={selectedRowKeys}
        onPageChange={onPageChange}
        onSelectedRowKeysChange={setSelectedRowKeys}
        onSelectedMembersChange={setSelectedMembersList}
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
        groupDisplayConfig={groupDisplayConfig}
        onSuccess={onSuccessModal}
      />

      <DeleteMemberModal
        open={activeModal === 'deleteMember'}
        onCancel={onCancelModal}
        memberIds={selectedMemberIds}
        members={selectedMembersList}
        onSuccess={onSuccessModal}
        groupId={groupId}
        groupDisplayConfig={groupDisplayConfig}
      />

      <AssignQuotaModal
        open={activeModal === 'assignQuota'}
        onCancel={onCancelModal}
        groupId={groupId}
        memberIds={selectedMemberIds}
        members={selectedMembersList}
        groupDisplayConfig={groupDisplayConfig}
        onSuccess={onSuccessModal}
      />
    </div>
  );
};

export default MemberList;
