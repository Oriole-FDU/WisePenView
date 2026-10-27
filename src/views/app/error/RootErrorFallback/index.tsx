import type { FallbackProps } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/components/base/Button';
import { getSupportErrorId } from '@/observability';

import styles from './style.module.scss';

function RootErrorFallback({ error }: FallbackProps) {
  const { t } = useTranslation('errors');
  const errorId = getSupportErrorId(error);

  return (
    <main className={styles.root}>
      <div className={styles.content}>
        <div className={styles.brand}>WisePen</div>
        <h1 className={styles.title}>{t('page.appUnavailable')}</h1>
        <p className={styles.description}>{t('page.reloadDescription')}</p>
        <p className={styles.errorId}>{t('page.errorId', { errorId })}</p>
        <div className={styles.actions}>
          <AppPressable
            className={styles.primaryButton}
            type="button"
            onClick={() => window.location.reload()}
          >
            {t('page.reload')}
          </AppPressable>
          <AppPressable
            className={styles.secondaryButton}
            type="button"
            onClick={() => window.location.assign('/')}
          >
            {t('page.backHome')}
          </AppPressable>
        </div>
      </div>
    </main>
  );
}

export default RootErrorFallback;
