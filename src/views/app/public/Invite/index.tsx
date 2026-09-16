import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import JoinByInviteCodeModal from '@/components/business/Group/JoinByInviteCodeModal';
import { useGroupService } from '@/domains';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

function PublicInvitePage() {
  const { t } = useTranslation('group');
  const groupService = useGroupService();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('code')?.trim() || '';

  if (!inviteCode) {
    return <Navigate to={APP_ROUTE_PATH.GROUPS} replace />;
  }

  return (
    <JoinByInviteCodeModal
      isOpen
      onOpenChange={(open) => {
        if (!open) navigate(APP_ROUTE_PATH.GROUPS, { replace: true });
      }}
      title={t('invite.title')}
      inviteCodeLabel={t('invite.inviteCode')}
      hint={t('invite.hint')}
      invalidCodeMessage={t('invite.invalidCode')}
      successMessage={t('invite.success')}
      initialInviteCode={inviteCode}
      onJoin={(code) => groupService.joinGroup({ inviteCode: code })}
    />
  );
}

export default PublicInvitePage;
