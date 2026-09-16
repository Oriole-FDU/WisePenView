import type { ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState } from '@/components/base/Feedback';
import { getErrorReportId, reportError } from '@/utils/error';
import shellStyles from '@/views/app/error/_components/ErrorPageShell/style.module.less';
import { buildAppErrorInfo } from '@/views/app/error/errorInfo';

import styles from './style.module.less';

interface RouteOutletBoundaryProps {
  children: ReactNode;
}

function RouteOutletFallback({ error, resetErrorBoundary }: FallbackProps) {
  const { t } = useTranslation('errors');
  const navigate = useNavigate();
  const location = useLocation();
  const errorInfo = buildAppErrorInfo(error);
  const errorId = getErrorReportId(error);

  return (
    <div className={styles.root}>
      <ResultState
        status={errorInfo.status}
        title={errorInfo.title}
        subTitle={errorInfo.subTitle}
        extra={
          <div className={shellStyles.actions}>
            <AppButton variant="primary" onPress={resetErrorBoundary}>
              {t('page.refresh')}
            </AppButton>
            <AppButton onPress={() => navigate(-1)}>{t('page.backPrevious')}</AppButton>
          </div>
        }
      >
        <p className={styles.errorId}>
          {t('page.errorIdWithPage', { errorId, pathname: location.pathname })}
        </p>
      </ResultState>
    </div>
  );
}

function RouteOutletBoundary({ children }: RouteOutletBoundaryProps) {
  const location = useLocation();

  return (
    <ErrorBoundary
      FallbackComponent={RouteOutletFallback}
      resetKeys={[location.key, location.pathname, location.search]}
      onError={(error, errorInfo) => {
        reportError(error, {
          origin: 'layout-boundary',
          pathname: location.pathname,
          componentStack: errorInfo.componentStack ?? undefined,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default RouteOutletBoundary;
