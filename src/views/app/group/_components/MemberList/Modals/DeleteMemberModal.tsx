import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import SelectedMemberList from '@/components/SelectedMemberList';
import { useGroupService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useTranslation } from 'react-i18next';
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
  const { loading, run: runDeleteMembers } = useRequest(
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
