import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState } from '@/components/base/Feedback';
import ErrorPageShell from '@/views/app/error/_components/ErrorPageShell';

import shellStyles from '../_components/ErrorPageShell/style.module.less';

export interface ScopedRouteNotFoundProps {
  homePath: string;
  homeLabelKey: 'page.backApp' | 'page.backAdmin';
}

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
          <div className={shellStyles.actions}>
            <AppButton variant="primary" onPress={() => navigate(homePath)}>
              {t(homeLabelKey)}
            </AppButton>
            <AppButton onPress={() => navigate(-1)}>{t('page.backPrevious')}</AppButton>
          </div>
        }
      />
    </ErrorPageShell>
  );
}

export default ScopedRouteNotFound;
