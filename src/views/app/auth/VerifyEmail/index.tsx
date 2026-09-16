import {
  consumeActiveAuthContinuation,
  getCurrentRouteSearch,
  readOptionalRedirectParam,
} from '@/bootstrap/authContinuation';
import { AppButton } from '@/components/Button';
import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import { useUserService } from '@/domains';
import type { ConfirmEmailVerifyRequest } from '@/domains/User';
import { useApi } from '@/hooks/useApi';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import { Alert, toast } from '@heroui/react';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import auth from '../_common/style.module.less';

function VerifyEmail() {
  const userService = useUserService();
  const { t } = useTranslation('auth');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const navigate = useNavigate();

  const routeSearch = getCurrentRouteSearch();
  const searchParams = new URLSearchParams(routeSearch);
  const token = searchParams.get('token');

  const { loading, run: runVerify } = useApi(
    (verifyToken: string) => {
      const params: ConfirmEmailVerifyRequest = { token: verifyToken };
      return userService.confirmEmailVerify(params);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('verifyEmail.verifySuccess'));
        setSuccessModalOpen(true);
      },
    }
  );

  const onVerify = () => {
    if (loading || !token) {
      if (!token) toast.danger(t('verifyEmail.invalidToken'));
      return;
    }
    runVerify(token);
  };

  const goToAccount = () => {
    setSuccessModalOpen(false);
    const queryRedirectPath = readOptionalRedirectParam(routeSearch);
    const continuation = consumeActiveAuthContinuation();
    navigate(queryRedirectPath ?? continuation?.redirectPath ?? APP_ROUTE_PATH.PROFILE_ACCOUNT, {
      replace: true,
      state: { fromVerify: true },
    });
  };

  return (
    <div className={auth.authContainer}>
      <h1 className={auth.title}>{t('verifyEmail.title')}</h1>
      <Alert status="accent" className={auth.authAlert}>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{t('verifyEmail.alertDescription')}</Alert.Description>
        </Alert.Content>
      </Alert>
      <div className={auth.formActions}>
        <AppButton
          variant="primary"
          size="lg"
          className={auth.submitButton}
          isDisabled={loading || !token}
          onPress={onVerify}
        >
          {t('verifyEmail.submit')}
        </AppButton>
      </div>
      <AppDisplayDialog
        isOpen={successModalOpen}
        onOpenChange={(open) => !open && goToAccount()}
        title={t('verifyEmail.successTitle')}
        primaryAction={{
          label: t('verifyEmail.goToAccount'),
          onPress: goToAccount,
        }}
      >
        <p>{t('verifyEmail.successDescription')}</p>
      </AppDisplayDialog>
    </div>
  );
}

export default VerifyEmail;
