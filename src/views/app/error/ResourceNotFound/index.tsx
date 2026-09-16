import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState } from '@/components/base/Feedback';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import ErrorPageShell from '@/views/app/error/_components/ErrorPageShell';

import shellStyles from '../_components/ErrorPageShell/style.module.less';

function ResourceNotFound() {
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
            <AppButton variant="primary" size="lg" onPress={() => navigate(APP_ROUTE_PATH.HOME)}>
              {t('page.backHome')}
            </AppButton>
            <AppButton size="lg" onPress={() => navigate(-1)}>
              {t('page.backPrevious')}
            </AppButton>
          </div>
        }
      />
    </ErrorPageShell>
  );
}

export default ResourceNotFound;
