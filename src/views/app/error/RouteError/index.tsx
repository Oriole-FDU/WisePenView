import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useRouteError } from 'react-router-dom';

import { ResultState } from '@/components/Feedback';
import { getErrorReportId } from '@/utils/error';
import { buildAppErrorInfo } from '../errorInfo';
import styles from './style.module.less';

function RouteError() {
  const { t } = useTranslation('errors');
  const navigate = useNavigate();
  const location = useLocation();
  const error = useRouteError();
  const errorInfo = buildAppErrorInfo(error);
  const errorId = getErrorReportId(error);

  return (
    <main className={styles.root}>
      <ResultState
        className={styles.result}
        status={errorInfo.status}
        title={errorInfo.title}
        subTitle={errorInfo.subTitle}
        extra={
          <div className={styles.actions}>
            <Button variant="primary" onPress={() => window.location.reload()}>
              {t('page.reload')}
            </Button>
            <Button onPress={() => navigate(-1)}>{t('page.backPrevious')}</Button>
          </div>
        }
      >
        <p className={styles.errorId}>
          {t('page.errorIdWithPage', { errorId, pathname: location.pathname })}
        </p>
      </ResultState>
    </main>
  );
}

export default RouteError;
