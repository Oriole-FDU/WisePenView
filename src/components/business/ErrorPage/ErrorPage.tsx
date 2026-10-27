import { toast } from '@heroui/react';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import AppIconButton from '@/components/base/Button/AppIconButton';
import { ResultState } from '@/components/base/Feedback';
import { getSupportErrorId } from '@/observability/capture';
import { copyText } from '@/utils/browser/copyText';

import { buildErrorDetail } from './errorDetail';
import { buildAppErrorInfo } from './errorInfo';
import styles from './ErrorPage.module.scss';
import ErrorPageActions from './ErrorPageActions';
import type { ErrorPageProps } from './index.type';

/**
 * 错误页内容：把任意错误统一渲染成文案、编号与操作。
 * 只负责内容，页内定位由调用方决定（整页用 ErrorPageShell，壳内用各自容器）。
 */
function ErrorPage({
  error,
  actionSize,
  onRetry,
  showDetail = false,
  showPathname = false,
}: ErrorPageProps) {
  const { t } = useTranslation('errors');
  const navigate = useNavigate();
  const location = useLocation();
  const [detailOpen, setDetailOpen] = useState(false);
  const errorInfo = buildAppErrorInfo(error);
  const errorId = getSupportErrorId(error);

  const handleRetry = onRetry ?? (() => window.location.reload());

  const handleCopyDetail = async () => {
    const copied = await copyText(buildErrorDetail(error, location.pathname, errorId));
    if (copied) {
      toast.success(t('page.copySuccess'));
      return;
    }

    toast.danger(t('page.copyFailed'));
  };

  return (
    <ResultState
      status={errorInfo.status}
      title={errorInfo.title}
      subTitle={errorInfo.subTitle}
      extra={
        <ErrorPageActions>
          <AppButton variant="primary" size={actionSize} onPress={handleRetry}>
            {t('page.refresh')}
          </AppButton>
          <AppButton size={actionSize} onPress={() => navigate(-1)}>
            {t('page.backPrevious')}
          </AppButton>
        </ErrorPageActions>
      }
    >
      <p className={styles.errorId}>
        {showPathname
          ? t('page.errorIdWithPage', { errorId, pathname: location.pathname })
          : t('page.errorId', { errorId })}
      </p>
      {showDetail ? (
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
              <pre className={styles.errorDetail}>
                {buildErrorDetail(error, location.pathname, errorId)}
              </pre>
              <span className={styles.contactTip}>{t('page.contactTip')}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </ResultState>
  );
}

export default ErrorPage;
