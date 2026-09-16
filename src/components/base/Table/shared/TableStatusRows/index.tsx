import { Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import styles from './style.module.less';

export function TableRefreshIndicator() {
  const { t } = useTranslation('table');

  return (
    <div className={styles.indicator} role="status" aria-live="polite">
      <Loader className={styles.spinner} size={12} aria-hidden />
      <span className={styles.label}>{t('refreshing')}</span>
    </div>
  );
}

export function TableLoadMoreRow() {
  const { t } = useTranslation('table');

  return (
    <div className={styles.loadMoreRow} role="status" aria-live="polite">
      <Loader className={styles.spinner} size={13} aria-hidden />
      <span className={styles.label}>{t('loadMore')}</span>
    </div>
  );
}
