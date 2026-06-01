import { Button, Skeleton } from '@heroui/react';
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
  return (
    <div className={styles.assetRow}>
      <div className={styles.balanceBlock}>
        <p className={styles.balanceLabel}>计算点余额</p>
        {loading ? (
          <Skeleton className={styles.balanceSkeleton} />
        ) : (
          <p className={styles.balanceValue}>
            {balance}
            <span className={styles.unit}>计算点</span>
          </p>
        )}
      </div>
      {canRecharge ? (
        <Button variant="primary" onPress={onRecharge}>
          充值
        </Button>
      ) : null}
    </div>
  );
}

export default WalletBalanceHeader;
