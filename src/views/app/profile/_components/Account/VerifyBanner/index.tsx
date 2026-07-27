import { Alert, Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import type { VerifyBannerProps } from './index.type';
import styles from './style.module.less';

function VerifyBanner({ visible, onGoVerify }: VerifyBannerProps) {
  const { t } = useTranslation('profile');

  if (!visible) return null;
  return (
    <Alert status="warning" className={styles.statusBanner}>
      <Alert.Indicator />
      <Alert.Content className={styles.bannerContent}>
        <Alert.Description>{t('verification.banner')}</Alert.Description>
      </Alert.Content>
      <div className={styles.bannerAction}>
        <Button size="sm" variant="primary" onPress={onGoVerify}>
          {t('verification.goVerify')}
        </Button>
      </div>
    </Alert>
  );
}

export default VerifyBanner;
