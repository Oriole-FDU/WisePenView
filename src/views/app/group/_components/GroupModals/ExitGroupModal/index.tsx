import { toast } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import AppAlertDialog from '@/components/business/AppAlertDialog';
import { useGroupService } from '@/domains';
import type { QuitGroupRequest } from '@/domains/Group';
import { useApi } from '@/hooks/useApi';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import styles from './index.module.less';
import type { ExitGroupModalProps } from './index.type';

function ExitGroupModal({
  isOpen,
  onOpenChange,
  groupName,
  groupId,
  onSuccess,
}: ExitGroupModalProps) {
  const { t } = useTranslation('group');
  const groupService = useGroupService();
  const navigate = useNavigate();

  const { loading, run: runExitGroup } = useApi(
    async () => {
      const params: QuitGroupRequest = { groupId: groupId! };
      await groupService.quitGroup(params);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('exit.success'));
        onSuccess?.();
        onOpenChange(false);
        navigate(APP_ROUTE_PATH.GROUPS);
      },
    }
  );

  const handleConfirm = () => {
    if (!groupId) {
      toast.danger(t('exit.missingId'));
      return;
    }
    runExitGroup();
  };

  return (
    <AppAlertDialog
      type="danger"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('exit.title')}
      description={t('exit.description')}
      confirmText={t('exit.confirm')}
      onConfirm={handleConfirm}
      isConfirmLoading={loading}
      isDismissable={!loading}
    >
      <div className={styles.exitGroupName}>{t('exit.target', { name: groupName })}</div>
    </AppAlertDialog>
  );
}

export default ExitGroupModal;
