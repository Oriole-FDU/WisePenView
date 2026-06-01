/**
 * 通用计算点钱包：个人余额走 /user/wallet；小组余额走 groupService.getGroupWalletInfo。
 * 点卡充值仅个人（redeemVoucher）；小组余额由组长通过「token 划拨」转入。
 * 交易明细 Tab：全部 / 充值 / 消费。
 * 个人「充值」仅 REFILL；小组「充值」与「消费」通过 walletService.listMergedTransactions 合并两类流水；其余走 listTransactions。
 * 数据请求使用 ahooks（不使用 useEffect）。
 */
import RechargeModal from '@/components/Wallet/RechargeModal';
import { useGroupService, useWalletService } from '@/domains';
import { WALLET_TARGET_TYPE, WALLET_TOKEN_TX_TYPE } from '@/domains/Wallet';
import type { EnumValue } from '@/utils/enum';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { usePagination, useRequest, useUnmount } from 'ahooks';
import { useCallback, useImperativeHandle, useRef, useState, type Ref } from 'react';
import type { ComputeWalletProps, ComputeWalletRef } from './index.type';
import styles from './style.module.less';
import WalletBalanceHeader from './WalletBalanceHeader';
import { PAGE_SIZE, tabToListType, type TxTabKey } from './walletHelpers';
import WalletTransactionTable from './WalletTransactionTable';

type WalletTxTypeQueryCode = EnumValue<typeof WALLET_TOKEN_TX_TYPE>;

function ComputeWallet({
  targetType,
  targetId,
  canRecharge,
  groupDisplayName,
  showOperatorColumn = false,
  surface = 'card',
  ref,
}: ComputeWalletProps & { ref?: Ref<ComputeWalletRef> }) {
  const walletService = useWalletService();
  const groupService = useGroupService();
  const effectiveGroupId = targetType === WALLET_TARGET_TYPE.GROUP ? (targetId ?? '').trim() : '';
  const walletReady = targetType === WALLET_TARGET_TYPE.USER || Boolean(effectiveGroupId);

  const [displayBalance, setDisplayBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [txTab, setTxTab] = useState<TxTabKey>('all');
  const txTabRef = useRef<TxTabKey>('all');
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [flashFirstRow, setFlashFirstRow] = useState(false);
  const firstBalanceRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const displayBalanceRef = useRef(0);

  /** 与展示余额同步更新 ref，供充值成功动画起点读取（禁止在 render 中写 ref） */
  const commitDisplayBalance = useCallback((value: number) => {
    displayBalanceRef.current = value;
    setDisplayBalance(value);
  }, []);

  const runBalanceAnimation = useCallback((from: number, to: number) => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }
    const duration = 650;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 2;
      const next = Math.round(from + (to - from) * eased);
      displayBalanceRef.current = next;
      setDisplayBalance(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const { runAsync: loadBalance } = useRequest(
    async (options?: { animateFrom?: number; silent?: boolean }) => {
      if (targetType === WALLET_TARGET_TYPE.GROUP && effectiveGroupId) {
        const groupBalance = await groupService.getGroupWalletInfo({ groupId: effectiveGroupId });
        return { balance: groupBalance, options };
      }
      const data = await walletService.getUserWalletInfo();
      return { balance: data.balance, options };
    },
    {
      ready: walletReady,
      refreshDeps: [walletService, groupService, targetType, effectiveGroupId],
      onBefore: (params) => {
        const options = params?.[0];
        if (!options?.silent) {
          setLoadingWallet(true);
        }
      },
      onSuccess: (res) => {
        const { balance, options } = res;
        if (firstBalanceRef.current) {
          commitDisplayBalance(balance);
          firstBalanceRef.current = false;
        } else if (options?.animateFrom !== undefined) {
          runBalanceAnimation(options.animateFrom, balance);
        } else {
          commitDisplayBalance(balance);
        }
        if (!options?.silent) {
          setLoadingWallet(false);
        }
      },
      onError: (err, params) => {
        toast.danger(parseErrorMessage(err));
        const options = params?.[0];
        if (!options?.silent) {
          setLoadingWallet(false);
        }
      },
    }
  );

  const {
    data: txData,
    loading: loadingTx,
    refresh: refreshTransactions,
    pagination: { current: page = 1, total = 0, onChange: onTxPageChange },
  } = usePagination(
    async ({ current, pageSize }) => {
      const tab = txTabRef.current;
      const gid =
        targetType === WALLET_TARGET_TYPE.GROUP && effectiveGroupId ? effectiveGroupId : undefined;

      if (tab === 'spend') {
        const { total: spendTotal, records: spendRecords } =
          await walletService.listMergedTransactions({
            groupId: gid,
            page: current,
            size: pageSize,
            typeA: WALLET_TOKEN_TX_TYPE.SPEND,
            typeB: WALLET_TOKEN_TX_TYPE.TRANSFER_OUT,
          });
        return { list: spendRecords, total: spendTotal };
      }

      if (tab === 'recharge' && targetType === WALLET_TARGET_TYPE.GROUP && effectiveGroupId) {
        const { total: rechargeTotal, records: rechargeRecords } =
          await walletService.listMergedTransactions({
            groupId: effectiveGroupId,
            page: current,
            size: pageSize,
            typeA: WALLET_TOKEN_TX_TYPE.REFILL,
            typeB: WALLET_TOKEN_TX_TYPE.TRANSFER_IN,
          });
        return { list: rechargeRecords, total: rechargeTotal };
      }

      const listType = tabToListType(tab);
      const { total: nextTotal, records } = await walletService.listTransactions({
        groupId: gid,
        page: current,
        size: pageSize,
        ...(listType !== undefined ? { type: listType } : {}),
      });
      return { list: records, total: nextTotal };
    },
    {
      ready: walletReady,
      defaultCurrent: 1,
      defaultPageSize: PAGE_SIZE,
      refreshDeps: [walletService, targetType, effectiveGroupId, txTab],
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const refreshWalletData = useCallback(async () => {
    await Promise.all([loadBalance({ silent: true }), Promise.resolve(refreshTransactions())]);
  }, [loadBalance, refreshTransactions]);

  useImperativeHandle(
    ref,
    () => ({
      refresh: async () => {
        await refreshWalletData();
      },
    }),
    [refreshWalletData]
  );

  useUnmount(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }
  });

  const personalRecharge = targetType === WALLET_TARGET_TYPE.USER && canRecharge;

  const { runAsync: runRecharge } = useRequest(
    async (code: string) => walletService.redeemVoucher({ voucherCode: code }),
    {
      manual: true,
      onSuccess: async () => {
        const from = displayBalanceRef.current;
        toast.success('充值成功');
        await loadBalance({ animateFrom: from, silent: true });
        onTxPageChange(1, PAGE_SIZE);
        setFlashFirstRow(true);
        window.setTimeout(() => setFlashFirstRow(false), 2400);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleRechargeSubmit = async (code: string) => {
    if (!personalRecharge) {
      return;
    }
    await runRecharge(code);
  };

  const handleTxTabChange = (key: string) => {
    const next = key as TxTabKey;
    txTabRef.current = next;
    setTxTab(next);
    onTxPageChange(1, PAGE_SIZE);
  };

  const rootClass = surface === 'plain' ? styles.plain : styles.card;

  return (
    <div className={rootClass}>
      <WalletBalanceHeader
        balance={displayBalance}
        loading={loadingWallet}
        canRecharge={Boolean(personalRecharge)}
        onRecharge={() => setRechargeOpen(true)}
      />

      <WalletTransactionTable
        activeTab={txTab}
        records={txData?.list ?? []}
        loading={loadingTx}
        flashFirstRow={flashFirstRow}
        showOperatorColumn={showOperatorColumn}
        onTabChange={handleTxTabChange}
      />

      <RechargeModal
        open={rechargeOpen}
        onCancel={() => setRechargeOpen(false)}
        groupDisplayName={groupDisplayName}
        onSubmit={handleRechargeSubmit}
      />
    </div>
  );
}

ComputeWallet.displayName = 'ComputeWallet';

export default ComputeWallet;
