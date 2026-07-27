import { Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useLocation, useNavigate, useRouteError } from 'react-router-dom';

import AppIconButton from '@/components/Button/AppIconButton';
import { ResultState } from '@/components/Feedback';
import LandingNavbar from '@/layouts/Home/_components/LandingNavbar';
import { copyText } from '@/utils/browser/copyText';
import { getErrorReportId } from '@/utils/error';
import ResourceNotFound from '@/views/app/error/ResourceNotFound';
import { Button, toast } from '@heroui/react';
import { buildAppErrorInfo } from '../errorInfo';
import { buildErrorDetail } from './errorDetail';
import styles from './style.module.less';

function AppError() {
  const { t } = useTranslation('errors');
  const navigate = useNavigate();
  const location = useLocation();
  const error = useRouteError();
  const [detailOpen, setDetailOpen] = useState(false);
  // 路由未命中抛出的 404 走专用 ResourceNotFound 页，避免通用错误壳与业务 404 语义混淆
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ResourceNotFound />;
  }

  const errorInfo = buildAppErrorInfo(error);
  const errorId = getErrorReportId(error);
  const errorDetail = buildErrorDetail(error, location.pathname, errorId);

  const handleCopyDetail = async () => {
    const copied = await copyText(errorDetail);
    if (copied) {
      toast.success(t('page.copySuccess'));
      return;
    }

    toast.danger(t('page.copyFailed'));
  };

  return (
    <div className={styles.root}>
      <div className={styles.navShell}>
        <LandingNavbar />
      </div>

      <main className={styles.main}>
        <ResultState
          className={styles.result}
          status={errorInfo.status}
          title={errorInfo.title}
          subTitle={errorInfo.subTitle}
          extra={
            <div className={styles.actionGroup}>
              <Button variant="primary" size="lg" onPress={() => window.location.reload()}>
                {t('page.refresh')}
              </Button>
              <Button size="lg" onPress={() => navigate(-1)}>
                {t('page.backPrevious')}
              </Button>
            </div>
          }
        >
          <p className={styles.errorId}>{t('page.errorId', { errorId })}</p>
          <div className={styles.errorCollapse}>
            <div className={styles.errorCollapseHeader}>
              <button
                type="button"
                className={styles.errorCollapseToggle}
                aria-expanded={detailOpen}
                onClick={() => setDetailOpen((open) => !open)}
              >
                {t('page.detail')}
              </button>
              <AppIconButton
                icon={<Copy aria-hidden="true" />}
                label={t('page.copyDetail')}
                size="sm"
                onPress={() => void handleCopyDetail()}
                onClick={(event) => event.stopPropagation()}
              />
            </div>
            {detailOpen ? (
              <div className={styles.errorDetailPanel}>
                <pre className={styles.errorDetail}>{errorDetail}</pre>
                <span className={styles.contactTip}>{t('page.contactTip')}</span>
              </div>
            ) : null}
          </div>
        </ResultState>
      </main>

      <footer className={styles.footerMini}>{t('page.footer')}</footer>
    </div>
  );
}

export default AppError;
