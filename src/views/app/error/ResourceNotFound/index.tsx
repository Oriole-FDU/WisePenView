import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ResultState } from '@/components/Feedback';
import LandingNavbar from '@/layouts/Home/_components/LandingNavbar';
import styles from './style.module.less';

function ResourceNotFound() {
  const { t } = useTranslation('errors');
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <div className={styles.navShell}>
        <LandingNavbar />
      </div>

      <main className={styles.main}>
        <ResultState
          className={styles.result}
          status="404"
          title={t('page.notFoundTitle')}
          subTitle={t('page.notFoundDescription')}
          extra={
            <div className={styles.actionGroup}>
              <Button variant="primary" size="lg" onPress={() => navigate('/')}>
                {t('page.backHome')}
              </Button>
              <Button size="lg" onPress={() => navigate(-1)}>
                {t('page.backPrevious')}
              </Button>
            </div>
          }
        />
      </main>

      <footer className={styles.footerMini}>{t('page.footer')}</footer>
    </div>
  );
}

export default ResourceNotFound;
