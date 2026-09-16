import { toast } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import AppAlertDialog from '@/components/business/AppAlertDialog';
import { useGroupService } from '@/domains';
import type { DeleteGroupRequest } from '@/domains/Group';
import { useApi } from '@/hooks/useApi';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import type { DissolveGroupModalProps } from './index.type';

function DissolveGroupModal({
  isOpen,
  onOpenChange,
  groupName,
  groupId,
  onSuccess,
}: DissolveGroupModalProps) {
  const { t } = useTranslation('group');
  const groupService = useGroupService();
  const navigate = useNavigate();

  const { loading, run: runDissolveGroup } = useApi(
    async () => {
      const params: DeleteGroupRequest = { groupId: groupId! };
      await groupService.deleteGroup(params);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('dissolve.success'));
        onSuccess?.();
        onOpenChange(false);
        navigate(APP_ROUTE_PATH.GROUPS);
      },
    }
  );

  const handleConfirm = () => {
    if (!groupId) {
      toast.warning(t('dissolve.missingId'));
      return;
    }
    runDissolveGroup();
  };

  return (
    <AppAlertDialog
      type="danger"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('dissolve.title')}
      description={t('dissolve.description', { name: groupName })}
      confirmText={t('dissolve.confirm')}
      onConfirm={handleConfirm}
      isConfirmLoading={loading}
      isDismissable={!loading}
    />
  );
}

export default DissolveGroupModal;
