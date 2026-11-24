import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';

import type { DriveSelectionActionsProps } from './index.type';
import styles from './style.module.scss';

function DriveSelectionActions({
  canMove,
  isTrashView,
  deleting,
  onClear,
  onMove,
  onDelete,
}: DriveSelectionActionsProps) {
  const { t } = useTranslation(['drive', 'common']);

  return (
    <div className={styles.selectionActions}>
      <AppButton variant="secondary" size="sm" onPress={onClear}>
        {t('table.clearSelection')}
      </AppButton>
      {canMove ? (
        <AppButton variant="secondary" size="sm" onPress={onMove}>
          {t('table.move')}
        </AppButton>
      ) : null}
      <AppButton variant="danger" size="sm" isDisabled={deleting} onPress={onDelete}>
        {isTrashView ? t('delete.permanent') : t('actions.delete', { ns: 'common' })}
      </AppButton>
    </div>
  );
}

export default DriveSelectionActions;
