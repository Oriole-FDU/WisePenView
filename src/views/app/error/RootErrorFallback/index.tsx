import type { FallbackProps } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { getErrorReportId } from '@/utils/error';
import styles from './style.module.less';

function RootErrorFallback({ error }: FallbackProps) {
  const { t } = useTranslation('errors');
  const errorId = getErrorReportId(error);

  return (
    <main className={styles.root}>
      <div className={styles.content}>
        <div className={styles.brand}>WisePen</div>
        <h1 className={styles.title}>{t('page.appUnavailable')}</h1>
        <p className={styles.description}>{t('page.reloadDescription')}</p>
        <p className={styles.errorId}>{t('page.errorId', { errorId })}</p>
        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => window.location.reload()}
          >
            {t('page.reload')}
          </button>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => window.location.assign('/')}
          >
            {t('page.backHome')}
          </button>
        </div>
      </div>
    </main>
  );
}

export default RootErrorFallback;
