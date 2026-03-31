/**
 * 通用计算点钱包模块：余额、点卡充值、交易明细分页与 Tab 筛选。
 *
 * 复用场景：
 * - 个人中心 /app/profile/usage：targetType=USER，一般不展示操作人列。
 * - 高级组详情「token明细」：targetType=GROUP，仅组长进入；展示操作人列。
 *
 * 体验约定：
 * - 首次加载余额用骨架屏；充值后静默刷新余额并做数字缓动（Ticker）。
 * - 充值成功后回到第一页拉流水，并对首行做一次高亮动画（模拟「新记录插入」反馈）。
 */
import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { usePagination, useRequest, useUnmount, useUpdateEffect } from 'ahooks';
import { Button, Pagination, Skeleton, Table, Tabs } from 'antd';
import { RiAddLine, RiArrowDownLine, RiArrowUpLine, RiSubtractLine } from 'react-icons/ri';
import { useUserService, useWalletService } from '@/contexts/ServicesContext';
import { WALLET_TARGET_TYPE, WALLET_TX_LIST_FILTER } from '@/constants/wallet';
import type { WalletTransactionRecord } from '@/types/wallet';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { useAppMessage } from '@/hooks/useAppMessage';
import RechargeModal from '@/components/Wallet/RechargeModal';
import type { ComputeWalletProps, ComputeWalletRef } from './index.type';
import styles from './style.module.less';

type TabKey = 'all' | 'recharge' | 'spend';

/** 需求默认每页 20 条流水 */
const PAGE_SIZE = 20;

/** UI Tab → getTransactions 的 type：0 全部 / 1 充值 / 2 消费 */
const tabToFilter = (key: TabKey): 0 | 1 | 2 => {
  if (key === 'recharge') return WALLET_TX_LIST_FILTER.RECHARGE;
  if (key === 'spend') return WALLET_TX_LIST_FILTER.SPEND;
  return WALLET_TX_LIST_FILTER.ALL;
};

const ComputeWallet = React.forwardRef<ComputeWalletRef, ComputeWalletProps>(
  ({ targetType, targetId, canRecharge, groupDisplayName, showOperatorColumn = false }, ref) => {
    const userService = useUserService();
    const walletService = useWalletService();
    const message = useAppMessage();
    const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
    const effectiveTargetId =
      targetType === WALLET_TARGET_TYPE.USER
        ? (targetId ?? resolvedUserId ?? '')
        : (targetId ?? '');
    const shouldResolveUserId = targetType === WALLET_TARGET_TYPE.USER && !targetId;

    const { loading: resolvingUser } = useRequest(() => userService.getUserInfo(), {
      ready: shouldResolveUserId,
      onSuccess: (u) => {
        setResolvedUserId(u.id);
      },
      onError: () => {
        setResolvedUserId(null);
        message.error('获取用户信息失败');
      },
    });
    /** 界面展示用余额（可能与接口瞬时一致，充值时会做动画插值） */
    const [displayBalance, setDisplayBalance] = useState(0);
    const [loadingWallet, setLoadingWallet] = useState(true);
    const [tab, setTab] = useState<TabKey>('all');
    const [rechargeOpen, setRechargeOpen] = useState(false);
    /** 充值成功后短时间内给表格第一行加高亮 class */
    const [flashFirstRow, setFlashFirstRow] = useState(false);
    /** 首次拉取余额时不做动画，避免从 0「假滚动」 */
    const firstBalanceRef = useRef(true);
    const rafRef = useRef<number | null>(null);
    /** 供充值前记录旧余额、与动画起点同步（避免闭包读到陈旧 state） */
    const displayBalanceRef = useRef(0);

    useUpdateEffect(() => {
      displayBalanceRef.current = displayBalance;
    }, [displayBalance]);

    /**
     * 余额缓动：从 from 到 to，ease-out 二次曲线，时长约 650ms。
     * 新动画开始前会 cancel 上一帧，防止快速连续充值时数字乱跳。
     */
    const runBalanceAnimation = useCallback((from: number, to: number) => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
      const duration = 650;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) ** 2;
        setDisplayBalance(Math.round(from + (to - from) * eased));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    }, []);

    /**
     * 拉取最新余额。
     * - silent：充值后不再顶骨架屏，仅更新数字（必要时带动画）。
     * - animateFrom：从指定旧值动画到服务端返回的新值，满足「Ticker」体验。
     */
    const { runAsync: loadBalance } = useRequest(
      async (options?: { animateFrom?: number; silent?: boolean }) => {
        if (!effectiveTargetId) {
          return null;
        }
        const { balance } = await walletService.getWalletInfo({
          targetType,
          targetId: effectiveTargetId,
        });
        return { balance, options };
      },
      {
        ready: Boolean(effectiveTargetId),
        refreshDeps: [walletService, targetType, effectiveTargetId],
        onBefore: (params) => {
          const options = params?.[0];
          if (!options?.silent) {
            setLoadingWallet(true);
          }
        },
        onSuccess: (res) => {
          if (!res) return;
          const { balance, options } = res;
          if (firstBalanceRef.current) {
            setDisplayBalance(balance);
            firstBalanceRef.current = false;
          } else if (options?.animateFrom !== undefined) {
            runBalanceAnimation(options.animateFrom, balance);
          } else {
            setDisplayBalance(balance);
          }
          if (!options?.silent) {
            setLoadingWallet(false);
          }
        },
        onError: (err, params) => {
          message.error(parseErrorMessage(err, '获取余额失败'));
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
        if (!effectiveTargetId) {
          return { list: [], total: 0 };
        }
        const typeFilter = tabToFilter(tab);
        const { total: nextTotal, records } = await walletService.listTransactions({
          targetType,
          targetId: effectiveTargetId,
          page: current,
          size: pageSize,
          type: typeFilter,
        });
        return { list: records, total: nextTotal };
      },
      {
        defaultCurrent: 1,
        defaultPageSize: PAGE_SIZE,
        refreshDeps: [walletService, targetType, effectiveTargetId, tab],
        onError: (err) => {
          message.error(parseErrorMessage(err, '获取交易明细失败'));
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

    const { runAsync: runRecharge } = useRequest(
      async (code: string) => {
        if (!effectiveTargetId) {
          throw new Error('missing target id');
        }
        return walletService.redeemVoucher({ targetType, targetId: effectiveTargetId, code });
      },
      {
        manual: true,
        onSuccess: async () => {
          const from = displayBalanceRef.current;
          /** 接口 data 为 null，到账金额以刷新后的 getWalletInfo 为准 */
          message.success('充值成功');
          await loadBalance({ animateFrom: from, silent: true });
          onTxPageChange(1, PAGE_SIZE);
          setFlashFirstRow(true);
          window.setTimeout(() => setFlashFirstRow(false), 2400);
        },
        onError: (err) => {
          if (!effectiveTargetId) {
            message.error('获取用户信息失败');
            return;
          }
          message.error(parseErrorMessage(err, '充值失败'));
        },
      }
    );

    const handleRechargeSubmit = async (code: string) => runRecharge(code);

    const handleTabChange = (key: string) => {
      setTab(key as TabKey);
      onTxPageChange(1, PAGE_SIZE);
    };

    type Row = WalletTransactionRecord & { key: React.Key };

    const columns = useMemo(() => {
      const cols: {
        title: string;
        dataIndex?: string;
        key: string;
        width?: number;
        align?: 'right';
        render?: (v: unknown, row: Row) => React.ReactNode;
      }[] = [
        {
          title: '时间',
          dataIndex: 'time',
          key: 'time',
          width: 180,
        },
        {
          title: '类型',
          dataIndex: 'type',
          key: 'type',
          width: 120,
          render: (t: unknown) => {
            const kind = t as WalletTransactionRecord['type'];
            return (
              <span className={styles.typeCell}>
                {kind === 'RECHARGE' ? (
                  <>
                    <RiArrowUpLine size={16} className={styles.amountRecharge} />
                    <RiAddLine size={14} className={styles.amountRecharge} />
                    <span>充值</span>
                  </>
                ) : (
                  <>
                    <RiArrowDownLine size={16} className={styles.amountSpend} />
                    <RiSubtractLine size={14} className={styles.amountSpend} />
                    <span>消费</span>
                  </>
                )}
              </span>
            );
          },
        },
        {
          title: '摘要 / 备注',
          key: 'summary',
          render: (_: unknown, row: Row) => (
            <div>
              <div className={styles.summaryMain}>{row.title || '—'}</div>
              <div className={styles.summarySub}>{row.subTitle || '—'}</div>
            </div>
          ),
        },
        {
          title: '变动金额',
          dataIndex: 'amount',
          key: 'amount',
          width: 120,
          align: 'right',
          render: (amount: unknown, row: Row) => {
            const isRecharge = row.type === 'RECHARGE';
            const n = Number(amount);
            const prefix = n > 0 ? '+' : '';
            return (
              <span className={isRecharge ? styles.amountRecharge : styles.amountSpend}>
                {prefix}
                {n}
              </span>
            );
          },
        },
      ];
      if (showOperatorColumn) {
        cols.push({
          title: '操作人',
          dataIndex: 'operatorName',
          key: 'operatorName',
          width: 120,
          render: (name: unknown) => (name != null && String(name).length > 0 ? String(name) : '—'),
        });
      }
      return cols;
    }, [showOperatorColumn]);

    const dataSource = useMemo(
      () =>
        (txData?.list ?? []).map((r: WalletTransactionRecord) => ({
          ...r,
          key: r.traceId || r.time,
        })),
      [txData?.list]
    );

    if (resolvingUser) {
      return <Skeleton active paragraph={{ rows: 4 }} />;
    }

    return (
      <div className={styles.card}>
        <div className={styles.assetRow}>
          <div className={styles.balanceBlock}>
            <p className={styles.balanceLabel}>计算点余额</p>
            {loadingWallet ? (
              <Skeleton.Input active style={{ width: 200, height: 44 }} />
            ) : (
              <p className={styles.balanceValue}>
                {displayBalance}
                <span className={styles.unit}>计算点</span>
              </p>
            )}
          </div>
          {canRecharge ? (
            <Button type="primary" onClick={() => setRechargeOpen(true)}>
              充值
            </Button>
          ) : null}
        </div>

        <h3 className={styles.panelTitle}>交易明细</h3>
        <Tabs
          className={styles.tabs}
          activeKey={tab}
          onChange={handleTabChange}
          items={[
            { key: 'all', label: '全部' },
            { key: 'recharge', label: '充值' },
            { key: 'spend', label: '消费' },
          ]}
        />

        <Table
          size="small"
          columns={columns}
          dataSource={dataSource}
          loading={loadingTx}
          pagination={false}
          locale={{
            emptyText: <div className={styles.empty}>暂无交易明细</div>,
          }}
          rowClassName={(_, index) => (flashFirstRow && index === 0 ? styles.rowFlash : '')}
        />

        {/* 仅多页时展示分页器，避免单页空白占位 */}
        {total > 0 && Math.ceil(total / PAGE_SIZE) > 1 ? (
          <Pagination
            style={{ marginTop: 16, textAlign: 'right' }}
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            showSizeChanger={false}
            onChange={onTxPageChange}
            showTotal={(t) => `共 ${t} 条`}
          />
        ) : null}

        <RechargeModal
          open={rechargeOpen}
          onCancel={() => setRechargeOpen(false)}
          groupDisplayName={groupDisplayName}
          onSubmit={handleRechargeSubmit}
        />
      </div>
    );
  }
);

ComputeWallet.displayName = 'ComputeWallet';

export default ComputeWallet;
