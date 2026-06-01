import { Alert, Button } from '@heroui/react';
import type { VerifyBannerProps } from './index.type';
import styles from './style.module.less';

function VerifyBanner({ visible, onGoVerify }: VerifyBannerProps) {
  if (!visible) return null;
  return (
    <Alert status="warning" className={styles.statusBanner}>
      <Alert.Indicator />
      <Alert.Content className={styles.bannerContent}>
        <Alert.Description>
          请通过邮箱验证或复旦 UIS 认证完成账号验证，否则部分功能可能无法正常使用。
        </Alert.Description>
      </Alert.Content>
      <div className={styles.bannerAction}>
        <Button size="sm" variant="primary" onPress={onGoVerify}>
          去验证
        </Button>
      </div>
    </Alert>
  );
}

export default VerifyBanner;
