import { useTranslation } from 'react-i18next';

import JoinByInviteCodeModal from '@/components/business/Group/JoinByInviteCodeModal';
import { useGroupService } from '@/domains';

import type { JoinGroupModalProps } from './index.type';

function JoinGroupModal({
  isOpen,
  onOpenChange,
  onSuccess,
  initialInviteCode,
}: JoinGroupModalProps) {
  const { t } = useTranslation('group');
  const groupService = useGroupService();

  return (
    <JoinByInviteCodeModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('join.title')}
      inviteCodeLabel={t('join.inviteCode')}
      hint={t('join.hint')}
      invalidCodeMessage={t('join.invalidCode')}
      successMessage={t('join.success')}
      initialInviteCode={initialInviteCode}
      onJoin={(inviteCode) => groupService.joinGroup({ inviteCode })}
      onSuccess={onSuccess}
    />
  );
}

export default JoinGroupModal;
