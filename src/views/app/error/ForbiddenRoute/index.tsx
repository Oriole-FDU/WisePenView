import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState } from '@/components/base/Feedback';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import ErrorPageShell from '@/views/app/error/_components/ErrorPageShell';

import shellStyles from '../_components/ErrorPageShell/style.module.less';

function ForbiddenRoute() {
  const { t } = useTranslation('errors');
  const navigate = useNavigate();

  return (
    <ErrorPageShell size="sm">
      <ResultState
        status="403"
        title={t('page.forbiddenTitle')}
        subTitle={t('page.forbiddenDescription')}
        extra={
          <div className={shellStyles.actions}>
            <AppButton variant="primary" onPress={() => navigate(-1)}>
              {t('page.backPrevious')}
            </AppButton>
            <AppButton onPress={() => navigate(APP_ROUTE_PATH.CHAT)}>{t('page.backApp')}</AppButton>
          </div>
        }
      />
    </ErrorPageShell>
  );
}

export default ForbiddenRoute;
