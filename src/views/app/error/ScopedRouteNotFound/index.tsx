import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState } from '@/components/base/Feedback';
import { ErrorPageActions, ErrorPageShell } from '@/components/business/ErrorPage';

import type { ScopedRouteNotFoundProps } from './index.type';

function ScopedRouteNotFound({ homePath, homeLabelKey }: ScopedRouteNotFoundProps) {
  const { t } = useTranslation('errors');
  const navigate = useNavigate();

  return (
    <ErrorPageShell size="sm">
      <ResultState
        status="404"
        title={t('page.notFoundTitle')}
        subTitle={t('page.notFoundDescription')}
        extra={
          <ErrorPageActions>
            <AppButton variant="primary" onPress={() => navigate(homePath)}>
              {t(homeLabelKey)}
            </AppButton>
            <AppButton onPress={() => navigate(-1)}>{t('page.backPrevious')}</AppButton>
          </ErrorPageActions>
        }
      />
    </ErrorPageShell>
  );
}

export default ScopedRouteNotFound;

export type { ScopedRouteNotFoundProps } from './index.type';
