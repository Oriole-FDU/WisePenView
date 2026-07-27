import { Select } from '@/components/Input';
import AppModal from '@/components/Overlay/AppModal';
import SelectedMemberList from '@/components/SelectedMemberList';
import { useGroupService } from '@/domains';
import { ROLE } from '@/domains/Group';
import type { EnumKey } from '@/utils/enum';
import { parseErrorMessage } from '@/utils/error';
import { Alert, Button, ListBox, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EditPermissionModalProps } from './index.type';
import styles from './style.module.less';
import { useMemberEditGuard } from './useMemberEditGuard';

function EditPermissionModal({
  isOpen,
  onOpenChange,
  onSuccess,
  groupId,
  memberIds,
  members,
  groupDisplayConfig,
}: EditPermissionModalProps) {
  const { t } = useTranslation(['group', 'common']);
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
        toast.success(t('member.editPermission.success', { count: memberIds.length }));
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
  const canPromoteToAdmin = groupDisplayConfig.canModifyPermission;

  const handleConfirm = () => {
    const role = ROLE[selectedPermission] ?? ROLE.MEMBER;
    runUpdatePermission(role);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && loading) return;
    onOpenChange(nextOpen);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={t('member.editPermission.title')}
      size="md"
      isDismissable={!loading}
      actions={
        <>
          <Button variant="secondary" isDisabled={loading} onPress={() => handleOpenChange(false)}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="primary"
            isDisabled={confirmDisabled || loading}
            aria-busy={loading || undefined}
            onPress={handleConfirm}
          >
            {t('actions.confirm', { ns: 'common' })}
          </Button>
        </>
      }
    >
      {memberContainsOwner ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{t('member.editPermission.ownerBlocked')}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : !canEdit ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{t('member.editPermission.unauthorized')}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : (
        <div className={styles.permissionRow}>
          <label className={styles.permissionLabel}>{t('member.editPermission.prompt')}</label>
          <Select
            aria-label={t('member.editPermission.aria')}
            value={selectedPermission}
            onChange={(value) => {
              if (value == null || Array.isArray(value)) return;
              setSelectedPermission(value as EnumKey<typeof ROLE>);
            }}
            className={styles.fullWidth}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {canPromoteToAdmin ? (
                  <ListBox.Item key="ADMIN" id="ADMIN" textValue={t('member.role.admin')}>
                    {t('member.role.admin')}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ) : null}
                <ListBox.Item key="MEMBER" id="MEMBER" textValue={t('member.role.member')}>
                  {t('member.role.member')}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      )}
      <SelectedMemberList members={members} />
    </AppModal>
  );
}

export default EditPermissionModal;
