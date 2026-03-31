/**
 * 高级组组长：个人计算点与小组池之间的 Token 划拨（giveTokenToGroup / giveTokenToOwner）。
 */
import React, { useCallback, useState } from 'react';
import { Button, InputNumber, Skeleton } from 'antd';
import { useRequest } from 'ahooks';
import { useUserService, useWalletService } from '@/contexts/ServicesContext';
import { WALLET_TARGET_TYPE } from '@/constants/wallet';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { OwnerGroupTokenTransferProps } from './index.type';
import styles from './style.module.less';

const OwnerGroupTokenTransfer: React.FC<OwnerGroupTokenTransferProps> = ({
  groupId,
  onTransferSuccess,
}) => {
  const userService = useUserService();
  const walletService = useWalletService();
  const message = useAppMessage();

  const [userId, setUserId] = useState<string | null>(null);
  const [personalBal, setPersonalBal] = useState(0);
  const [groupBal, setGroupBal] = useState(0);
  const [amtToGroup, setAmtToGroup] = useState<number | null>(null);
  const [amtToOwner, setAmtToOwner] = useState<number | null>(null);

  const { loading: userLoading } = useRequest(async () => userService.getUserInfo(), {
    refreshDeps: [userService],
    onSuccess: (user) => {
      setUserId(user.id);
    },
    onError: () => {
      setUserId(null);
      message.error('获取当前用户失败');
    },
  });

  const { loading: balanceLoading, runAsync: loadBalances } = useRequest(
    async () => {
      if (!userId || !groupId) {
        return null;
      }
      const [p, g] = await Promise.all([
        walletService.getWalletInfo({
          targetType: WALLET_TARGET_TYPE.USER,
          targetId: userId,
        }),
        walletService.getWalletInfo({
          targetType: WALLET_TARGET_TYPE.GROUP,
          targetId: groupId,
        }),
      ]);
      return { personalBal: p.balance, groupBal: g.balance };
    },
    {
      ready: Boolean(userId && groupId),
      refreshDeps: [userId, groupId, walletService],
      onSuccess: (res) => {
        if (!res) return;
        setPersonalBal(res.personalBal);
        setGroupBal(res.groupBal);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '获取余额失败'));
      },
    }
  );

  /** 接口成功后统一：重拉本页两侧余额，并通知父级刷新「token明细」Tab 内钱包 */
  const refreshAfterTransfer = useCallback(async () => {
    await loadBalances();
    onTransferSuccess?.();
  }, [loadBalances, onTransferSuccess]);

  const { loading: submittingToGroup, runAsync: runGiveToGroup } = useRequest(
    async (amount: number) => walletService.giveTokenToGroup({ groupId, amount }),
    {
      manual: true,
      onSuccess: async () => {
        message.success('已转入小组池');
        setAmtToGroup(null);
        await refreshAfterTransfer();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '转入失败'));
      },
    }
  );

  const { loading: submittingToOwner, runAsync: runGiveToOwner } = useRequest(
    async (amount: number) => walletService.giveTokenToOwner({ groupId, amount }),
    {
      manual: true,
      onSuccess: async () => {
        message.success('已转回组长账户');
        setAmtToOwner(null);
        await refreshAfterTransfer();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '转回失败'));
      },
    }
  );

  const handleGiveToGroup = async () => {
    const n = amtToGroup;
    if (n == null || !Number.isFinite(n) || n <= 0) {
      message.warning('请输入大于 0 的整数');
      return;
    }
    if (n > personalBal) {
      message.warning('组长个人计算点不足');
      return;
    }
    await runGiveToGroup(Math.floor(n));
  };

  const handleGiveToOwner = async () => {
    const n = amtToOwner;
    if (n == null || !Number.isFinite(n) || n <= 0) {
      message.warning('请输入大于 0 的整数');
      return;
    }
    if (n > groupBal) {
      message.warning('小组池计算点不足');
      return;
    }
    await runGiveToOwner(Math.floor(n));
  };

  if (userLoading) {
    return (
      <div className={styles.card}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </div>
    );
  }

  if (!userId) {
    return <div className={styles.card}>无法获取登录用户信息，请重新登录后再试。</div>;
  }

  return (
    <div className={styles.card}>
      <p className={styles.intro}>
        高级组的小组计算点仅组长可通过点卡充值；您也可以将组长个人账户中的计算点划入小组池，或将小组池余额转回个人账户，便于统一给组员分配使用。
      </p>

      <div className={styles.balanceHeader}>
        <h3 className={styles.balanceTitle}>当前余额</h3>
        <Button onClick={() => void loadBalances()} disabled={balanceLoading}>
          刷新
        </Button>
      </div>
      <div className={styles.balanceRow}>
        <div className={styles.balanceItem}>
          <p className={styles.balanceLabel}>组长个人计算点</p>
          {balanceLoading ? (
            <Skeleton.Input active className={styles.balanceSkeleton} size="small" />
          ) : (
            <p className={styles.balanceValue}>
              {personalBal}
              <span className={styles.unit}>点</span>
            </p>
          )}
        </div>
        <div className={styles.balanceItem}>
          <p className={styles.balanceLabel}>小组池计算点</p>
          {balanceLoading ? (
            <Skeleton.Input active className={styles.balanceSkeleton} size="small" />
          ) : (
            <p className={styles.balanceValue}>
              {groupBal}
              <span className={styles.unit}>点</span>
            </p>
          )}
        </div>
      </div>

      <hr className={styles.divider} />

      <h4 className={styles.transferTitle}>划入小组池</h4>
      <div className={styles.formRow}>
        <InputNumber
          className={styles.amountInput}
          min={1}
          max={personalBal > 0 ? personalBal : undefined}
          precision={0}
          placeholder="数量"
          value={amtToGroup ?? undefined}
          onChange={(v) => setAmtToGroup(typeof v === 'number' ? v : null)}
          disabled={submittingToGroup || balanceLoading}
        />
        <Button
          type="primary"
          loading={submittingToGroup}
          disabled={balanceLoading}
          onClick={() => void handleGiveToGroup()}
        >
          确认转入小组
        </Button>
      </div>

      <hr className={styles.divider} />

      <h4 className={styles.transferTitle}>从小组池转回组长</h4>
      <div className={styles.formRow}>
        <InputNumber
          className={styles.amountInput}
          min={1}
          max={groupBal > 0 ? groupBal : undefined}
          precision={0}
          placeholder="数量"
          value={amtToOwner ?? undefined}
          onChange={(v) => setAmtToOwner(typeof v === 'number' ? v : null)}
          disabled={submittingToOwner || balanceLoading}
        />
        <Button
          type="primary"
          loading={submittingToOwner}
          disabled={balanceLoading}
          onClick={() => void handleGiveToOwner()}
        >
          确认转回组长
        </Button>
      </div>
    </div>
  );
};

export default OwnerGroupTokenTransfer;
