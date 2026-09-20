import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { joinClassNames } from '@/components/base/Table/shared/TableBase/cellAlign';

import type { InlineEditErrorProps } from './index.type';
import styles from './style.module.less';

function InlineEditError({ message, onDismiss, className }: InlineEditErrorProps) {
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

export default InlineEditError;
