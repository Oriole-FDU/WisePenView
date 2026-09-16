import { Info } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppBanner from '@/components/base/AppBanner';
import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import { USER_STATUS } from '@/domains/User';

import VerifyBanner from '../VerifyBanner';
import AccountVerificationForm from './AccountVerificationForm';
import AccountVerificationOutcomeDialog from './AccountVerificationOutcomeDialog';
import type { AccountVerificationProps } from './index.type';
import styles from './style.module.less';
import { useAccountVerificationController } from './useAccountVerificationController';

function AccountVerification({
  user,
  onUserInfoReload,
  defaultOpen = false,
  defaultMode = 'uis',
  showVerifyBanner = true,
  onVerified,
}: AccountVerificationProps) {
  const { t } = useTranslation(['profile', 'common']);
  const [verifyModalOpen, setVerifyModalOpen] = useState(defaultOpen);
  const verification = useAccountVerificationController({
    defaultMode,
    onUserInfoReload,
    onSubmitted: () => setVerifyModalOpen(false),
    onVerified,
  });

  const handleVerify = () => {
    verification.endUisPolling();
    verification.resetVerifyForm();
    setVerifyModalOpen(true);
  };

  const handleVerifyModalClose = () => {
    verification.resetVerifyForm();
    setVerifyModalOpen(false);
  };

  const handleVerifyModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleVerifyModalClose();
      return;
    }

    setVerifyModalOpen(true);
  };

  const showBanner = showVerifyBanner && user?.userInfo?.status === USER_STATUS.UNVERIFIED;

  return (
    <>
      <VerifyBanner visible={showBanner} onGoVerify={handleVerify} />

      <AppModal
        isOpen={verifyModalOpen}
        onOpenChange={handleVerifyModalOpenChange}
        title={t('profile:verification.title')}
        size="md"
        isDismissable={!verification.verifySubmitting}
        actions={
          <>
            <AppButton
              variant="secondary"
              isDisabled={verification.verifySubmitting}
              onPress={handleVerifyModalClose}
            >
              {t('common:actions.cancel')}
            </AppButton>
            <AppButton
              variant="primary"
              isDisabled={verification.verifySubmitting}
              aria-busy={verification.verifySubmitting || undefined}
              onPress={verification.handleVerifySubmit}
            >
              {verification.verifyMode === 'email'
                ? t('profile:verification.sendEmail')
                : t('profile:verification.startUis')}
            </AppButton>
          </>
        }
      >
        <AppBanner
          className={styles.verifySharedInfo}
          status="accent"
          icon={<Info size={18} />}
          description={t('profile:verification.description')}
        />
        <AccountVerificationForm
          formId="account-verification-form"
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
      </AppModal>

      <AccountVerificationOutcomeDialog
        isOpen={verification.uisOutcomeOpen}
        uisOutcome={verification.uisOutcome}
        uisAwaitingScan={verification.uisAwaitingScan}
        uisQrImageSrc={verification.uisQrImageSrc}
        onClose={verification.handleUisOutcomeModalClose}
      />
    </>
  );
}

export default AccountVerification;
