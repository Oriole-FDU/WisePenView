import { Alert } from '@heroui/react';
import { CircleCheck, Info } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { readRedirectParam } from '@/bootstrap/authContinuation';
import { AppButton } from '@/components/base/Button';
import { Spin } from '@/components/base/Feedback';
import { useUserService } from '@/domains';
import type { UserAccountProfile } from '@/domains/User';
import { USER_STATUS } from '@/domains/User';
import { useApi } from '@/hooks/useApi';
import AccountVerificationForm from '@/views/app/profile/_components/Account/AccountVerification/AccountVerificationForm';
import AccountVerificationOutcomeDialog from '@/views/app/profile/_components/Account/AccountVerification/AccountVerificationOutcomeDialog';
import { useAccountVerificationController } from '@/views/app/profile/_components/Account/AccountVerification/useAccountVerificationController';

import auth from '../Auth.module.less';

function AuthBindingOnboarding() {
  const { t } = useTranslation(['auth', 'common']);
  const userService = useUserService();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = readRedirectParam(location.search);
  const [user, setUser] = useState<UserAccountProfile | null>(null);

  const { loading, runAsync: reloadUserInfo } = useApi(() => userService.getFullUserInfo(), {
    onSuccess: (data) => {
      setUser(data);
    },
  });

  const handleContinue = () => {
    navigate(redirectPath, { replace: true });
  };

  const verified = user?.userInfo.status === USER_STATUS.NORMAL;
  const verification = useAccountVerificationController({
    defaultMode: 'uis',
    onUserInfoReload: reloadUserInfo,
    onVerified: handleContinue,
  });

  return (
    <div className={auth.authContainer}>
      <h1 className={auth.title}>{t('onboarding.title')}</h1>
      <Spin spinning={loading}>
        <div className={auth.onboardingBody}>
          <Alert status={verified ? 'success' : 'accent'}>
            <Alert.Indicator>
              {verified ? <CircleCheck size={18} /> : <Info size={18} />}
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>
                {verified ? t('onboarding.verifiedTitle') : t('onboarding.pendingTitle')}
              </Alert.Title>
              <Alert.Description>{t('onboarding.description')}</Alert.Description>
            </Alert.Content>
          </Alert>

          {verified ? null : (
            <AccountVerificationForm
              formId="auth-binding-onboarding-form"
              verifyMode={verification.verifyMode}
              email={verification.email}
              uisAccount={verification.uisAccount}
              uisPassword={verification.uisPassword}
              verifyFormErrors={verification.verifyFormErrors}
              onModeChange={verification.handleVerifyModeChange}
              onEmailChange={verification.handleEmailChange}
              onUisAccountChange={verification.handleUisAccountChange}
              onUisPasswordChange={verification.handleUisPasswordChange}
              onSubmit={verification.handleVerifyFormSubmit}
            />
          )}

          <div className={auth.onboardingActions}>
            <AppButton
              variant="primary"
              size="lg"
              isDisabled={verification.verifySubmitting}
              aria-busy={verification.verifySubmitting || undefined}
              onPress={verified ? handleContinue : verification.handleVerifySubmit}
            >
              {verified ? t('onboarding.continue') : t('onboarding.confirm')}
            </AppButton>
            {!verified ? (
              <AppButton
                variant="secondary"
                size="lg"
                isDisabled={verification.verifySubmitting}
                onPress={handleContinue}
              >
                {t('onboarding.skip')}
              </AppButton>
            ) : null}
          </div>
        </div>
      </Spin>
      <AccountVerificationOutcomeDialog
        isOpen={verification.uisOutcomeOpen}
        uisOutcome={verification.uisOutcome}
        uisAwaitingScan={verification.uisAwaitingScan}
        uisQrImageSrc={verification.uisQrImageSrc}
        onClose={verification.handleUisOutcomeModalClose}
      />
    </div>
  );
}

export default AuthBindingOnboarding;
