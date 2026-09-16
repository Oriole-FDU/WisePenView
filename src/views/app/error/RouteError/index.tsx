import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useRouteError } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState } from '@/components/base/Feedback';
import { getErrorReportId } from '@/utils/error';
import ErrorPageShell from '@/views/app/error/_components/ErrorPageShell';

import shellStyles from '../_components/ErrorPageShell/style.module.less';
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
    <ErrorPageShell size="md">
      <ResultState
        status={errorInfo.status}
        title={errorInfo.title}
        subTitle={errorInfo.subTitle}
        extra={
          <div className={shellStyles.actions}>
            <AppButton variant="primary" onPress={() => window.location.reload()}>
              {t('page.reload')}
            </AppButton>
            <AppButton onPress={() => navigate(-1)}>{t('page.backPrevious')}</AppButton>
          </div>
        }
      >
        <p className={styles.errorId}>
          {t('page.errorIdWithPage', { errorId, pathname: location.pathname })}
        </p>
      </ResultState>
    </ErrorPageShell>
  );
}

export default RouteError;
