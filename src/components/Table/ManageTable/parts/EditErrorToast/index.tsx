import AppIconButton from '@/components/Button/AppIconButton';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { joinClassNames } from '../../../shared/TableBase/cellAlign';
import type { TableEditErrorToastProps } from './index.type';
import styles from './style.module.less';

function TableEditErrorToast({ message, onDismiss, className }: TableEditErrorToastProps) {
  const { t } = useTranslation('table');

  return (
    <div className={joinClassNames(styles.toast, className)} role="alert">
      <div className={styles.message}>{message}</div>
      {onDismiss ? (
        <AppIconButton
          icon={<X size={16} aria-hidden="true" />}
          label={t('aria.dismissError')}
          size="sm"
          className={styles.dismissButton}
          onPress={onDismiss}
        />
      ) : null}
    </div>
  );
}

export default TableEditErrorToast;
