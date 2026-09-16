import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';

import ResourcePermissionPanel from '../ResourcePermissionPanel';
import type { ResourcePermissionModalProps } from './index.type';
import styles from './style.module.less';

function ResourcePermissionModal({
  isOpen,
  resourceId,
  resourceType,
  onOpenChange,
  onSuccess,
}: ResourcePermissionModalProps) {
  const { t } = useTranslation(['resource', 'common']);
  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('permission.modal.title')}
      description={t('permission.modal.description')}
      size="lg"
      bodyClassName={styles.modalBody}
      actions={
        <AppButton variant="secondary" onPress={() => onOpenChange(false)}>
          {t('actions.close', { ns: 'common' })}
        </AppButton>
      }
    >
      <AppModal.DeferredContent fallback={<div className={styles.deferredPanel} />}>
        {() => (
          <ResourcePermissionPanel
            resourceId={resourceId}
            resourceType={resourceType}
            onSuccess={onSuccess}
          />
        )}
      </AppModal.DeferredContent>
    </AppModal>
  );
}

export default ResourcePermissionModal;
