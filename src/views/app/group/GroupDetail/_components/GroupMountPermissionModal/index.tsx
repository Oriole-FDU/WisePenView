import AppModal from '@/components/Overlay/AppModal';
import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import GroupPolicyShellCard from '../GroupPolicyShellCard';
import styles from '../style.module.less';

interface GroupMountPermissionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function GroupMountPermissionModal({ isOpen, onOpenChange }: GroupMountPermissionModalProps) {
  const { t } = useTranslation(['group', 'common']);
  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('permission.mountTitle')}
      size="lg"
      containerClassName={styles.mountModalContainer}
      dialogClassName={styles.mountModalDialog}
      actions={
        <>
          <Button variant="secondary" onPress={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button variant="primary" isDisabled>
            {t('actions.save', { ns: 'common' })}
          </Button>
        </>
      }
    >
      <div className={styles.modalFormPadding}>
        <div className={styles.advancedMountGrid}>
          <GroupPolicyShellCard title={t('permission.mountList')} />
        </div>
      </div>
    </AppModal>
  );
}

export default GroupMountPermissionModal;
