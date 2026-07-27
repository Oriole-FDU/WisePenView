import AppModal from '@/components/Overlay/AppModal';
import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
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
        <Button variant="secondary" onPress={() => onOpenChange(false)}>
          {t('actions.close', { ns: 'common' })}
        </Button>
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
