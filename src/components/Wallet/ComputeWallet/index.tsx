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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Pagination, Skeleton, Table, Tabs } from 'antd';
import { RiAddLine, RiArrowDownLine, RiArrowUpLine, RiSubtractLine } from 'react-icons/ri';
import { useWalletService } from '@/contexts/ServicesContext';
import { WALLET_TX_LIST_FILTER } from '@/constants/wallet';
import type { WalletTransactionRecord } from '@/types/wallet';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { useAppMessage } from '@/hooks/useAppMessage';
import RechargeModal from '@/components/Wallet/RechargeModal';
import type { ComputeWalletProps } from './index.type';
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

const ComputeWallet: React.FC<ComputeWalletProps> = ({
  targetType,
  targetId,
  canRecharge,
  groupDisplayName,
  showOperatorColumn = false,
  syncRevision,
}) => {
  const walletService = useWalletService();
  const message = useAppMessage();
  /** 界面展示用余额（可能与接口瞬时一致，充值时会做动画插值） */
  const [displayBalance, setDisplayBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [tab, setTab] = useState<TabKey>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<WalletTransactionRecord[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  /** 充值成功后短时间内给表格第一行加高亮 class */
  const [flashFirstRow, setFlashFirstRow] = useState(false);
  /** 首次拉取余额时不做动画，避免从 0「假滚动」 */
  const firstBalanceRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  /** 供充值前记录旧余额、与动画起点同步（避免闭包读到陈旧 state） */
  const displayBalanceRef = useRef(0);

  useEffect(() => {
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
  const loadBalance = useCallback(
    async (options?: { animateFrom?: number; silent?: boolean }) => {
      if (!options?.silent) {
        setLoadingWallet(true);
      }
      try {
        const { balance: b } = await walletService.getWalletInfo({ targetType, targetId });
        if (firstBalanceRef.current) {
          setDisplayBalance(b);
          firstBalanceRef.current = false;
        } else if (options?.animateFrom !== undefined) {
          runBalanceAnimation(options.animateFrom, b);
        } else {
          setDisplayBalance(b);
        }
      } catch (err) {
        message.error(parseErrorMessage(err, '获取余额失败'));
      } finally {
        if (!options?.silent) {
          setLoadingWallet(false);
        }
      }
    },
    [walletService, targetType, targetId, message, runBalanceAnimation]
  );

  const loadTransactions = useCallback(
    async (p: number, tabKey: TabKey) => {
      setLoadingTx(true);
      try {
        const typeFilter = tabToFilter(tabKey);
        const { total: t, records: list } = await walletService.listTransactions({
          targetType,
          targetId,
          page: p,
          size: PAGE_SIZE,
          type: typeFilter,
        });
        setTotal(t);
        setRecords(list);
      } catch (err) {
        message.error(parseErrorMessage(err, '获取交易明细失败'));
        setRecords([]);
        setTotal(0);
      } finally {
        setLoadingTx(false);
      }
    },
    [walletService, targetType, targetId, message]
  );

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    void loadTransactions(page, tab);
  }, [loadTransactions, page, tab]);

  /** 外部划拨等操作后由父级递增 syncRevision，避免整页 Tabs items 重建 */
  useEffect(() => {
    if (syncRevision == null || syncRevision < 1) {
      return;
    }
    void loadBalance({ silent: true });
    void loadTransactions(page, tab);
  }, [syncRevision, loadBalance, loadTransactions, page, tab]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleRechargeSubmit = async (code: string) => {
    const from = displayBalanceRef.current;
    try {
      await walletService.redeemVoucher({ targetType, targetId, code });
      /** 接口 data 为 null，到账金额以刷新后的 getWalletInfo 为准 */
      message.success('充值成功');
      await loadBalance({ animateFrom: from, silent: true });
      setPage(1);
      await loadTransactions(1, tab);
      setFlashFirstRow(true);
      window.setTimeout(() => setFlashFirstRow(false), 2400);
    } catch (err) {
      message.error(parseErrorMessage(err, '充值失败'));
      throw err;
    }
  };

  const handleTabChange = (key: string) => {
    setTab(key as TabKey);
    setPage(1);
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
    () => records.map((r) => ({ ...r, key: r.traceId || r.time })),
    [records]
  );

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
          <Button type="primary" size="large" onClick={() => setRechargeOpen(true)}>
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
          onChange={(p) => setPage(p)}
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
};

export default ComputeWallet;
