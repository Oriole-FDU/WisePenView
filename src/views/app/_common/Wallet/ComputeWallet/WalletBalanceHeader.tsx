import { Button, Skeleton } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

interface WalletBalanceHeaderProps {
  balance: number;
  loading: boolean;
  canRecharge: boolean;
  onRecharge: () => void;
}

function WalletBalanceHeader({
  balance,
  loading,
  canRecharge,
  onRecharge,
}: WalletBalanceHeaderProps) {
  const { i18n, t } = useTranslation('wallet');
  const locale = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';
  return (
    <div className={styles.assetRow}>
      <div className={styles.balanceBlock}>
        <p className={styles.balanceLabel}>{t('balance.label')}</p>
        {loading ? (
          <Skeleton className={styles.balanceSkeleton} />
        ) : (
          <p className={styles.balanceValue}>
            {balance.toLocaleString(locale)}
            <span className={styles.unit}>{t('balance.unit')}</span>
          </p>
        )}
      </div>
      {canRecharge ? (
        <Button variant="primary" onPress={onRecharge}>
          {t('balance.recharge')}
        </Button>
      ) : null}
    </div>
  );
}

export default WalletBalanceHeader;
