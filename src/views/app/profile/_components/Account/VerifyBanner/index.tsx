import { useTranslation } from 'react-i18next';

import AppBanner from '@/components/base/AppBanner';
import { AppButton } from '@/components/base/Button';

import type { VerifyBannerProps } from './index.type';
import styles from './style.module.less';

function VerifyBanner({ visible, onGoVerify }: VerifyBannerProps) {
  const { t } = useTranslation('profile');

  if (!visible) return null;
  return (
    <AppBanner
      status="warning"
      className={styles.statusBanner}
      description={t('verification.banner')}
      action={
        <AppButton size="sm" variant="primary" onPress={onGoVerify}>
          {t('verification.goVerify')}
        </AppButton>
      }
    />
  );
}

export default VerifyBanner;
