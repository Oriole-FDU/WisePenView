import { toast } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import AppAlertDialog from '@/components/business/AppAlertDialog';
import SelectedMemberList from '@/components/business/SelectedMemberList';
import { useGroupService } from '@/domains';
import { useApi } from '@/hooks/useApi';

import type { DeleteMemberModalProps } from './index.type';
import { useMemberEditGuard } from './useMemberEditGuard';

function DeleteMemberModal({
  isOpen,
  onOpenChange,
  onSuccess,
  memberIds,
  members,
  groupId,
  groupDisplayConfig,
}: DeleteMemberModalProps) {
  const { t } = useTranslation('group');
  const groupService = useGroupService();
  const { loading, run: runDeleteMembers } = useApi(
    async () =>
      groupService.kickMembers({
        groupId,
        targetUserIds: memberIds,
      }),
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('member.delete.success', { count: memberIds.length }));
        onSuccess?.();
        onOpenChange(false);
      },
    }
  );

  const { memberContainsOwner, canEdit, confirmDisabled } = useMemberEditGuard(
    members,
    groupDisplayConfig.editableRoles,
    { checkOwner: true }
  );

  const description = memberContainsOwner
    ? t('member.delete.ownerBlocked')
    : !canEdit
      ? t('member.delete.unauthorized')
      : t('member.delete.description');

  return (
    <AppAlertDialog
      type="danger"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('member.delete.title')}
      description={description}
      confirmText={t('member.delete.confirm')}
      onConfirm={runDeleteMembers}
      isConfirmLoading={loading}
      isConfirmDisabled={confirmDisabled || loading}
      size="md"
      isDismissable={!loading}
    >
      <SelectedMemberList members={members} />
    </AppAlertDialog>
  );
}

export default DeleteMemberModal;
