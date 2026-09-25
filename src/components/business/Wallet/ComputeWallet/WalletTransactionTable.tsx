import { Chip } from '@heroui/react';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DataTable, type DataTableColumn } from '@/components/base/Table';
import { WALLET_TRANSACTION_KIND, type WalletTransactionRecord } from '@/domains/Wallet';
import { cn } from '@/utils/cn';
import { formatCompactNumber } from '@/utils/format/formatNumber';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';

import styles from './style.module.less';
import {
  isInflowKind,
  isNeutralKind,
  normalizeMaskDisplayText,
  TX_TABS,
  type TxTabKey,
} from './walletHelpers';

type WalletTransactionRow = WalletTransactionRecord & { key: string };
type WalletTransactionTone = 'inflow' | 'outflow' | 'record';

function getTransactionKindKey(kind: WalletTransactionRecord['type']): string {
  switch (kind) {
    case WALLET_TRANSACTION_KIND.REFILL:
      return 'transaction.kind.refill';
    case WALLET_TRANSACTION_KIND.SPEND:
      return 'transaction.kind.spend';
    case WALLET_TRANSACTION_KIND.TRANSFER_IN:
      return 'transaction.kind.transferIn';
    case WALLET_TRANSACTION_KIND.TRANSFER_OUT:
      return 'transaction.kind.transferOut';
    case WALLET_TRANSACTION_KIND.INCOME:
      return 'transaction.kind.income';
    case WALLET_TRANSACTION_KIND.EXCHANGE:
      return 'transaction.kind.exchange';
    case WALLET_TRANSACTION_KIND.REVERSE:
      return 'transaction.kind.reverse';
    case WALLET_TRANSACTION_KIND.GIFT:
      return 'transaction.kind.gift';
    case WALLET_TRANSACTION_KIND.ONLY_RECORD_META:
      return 'transaction.kind.onlyRecordMeta';
  }
}

function getTransactionTone(type: WalletTransactionRecord['type']): WalletTransactionTone {
  if (isNeutralKind(type)) return 'record';
  return isInflowKind(type) ? 'inflow' : 'outflow';
}

function getToneChipClassName(tone: WalletTransactionTone): string {
  if (tone === 'inflow') return styles.typeChipInflow;
  if (tone === 'outflow') return styles.typeChipOutflow;
  return styles.typeChipRecord;
}

function getToneAmountClassName(tone: WalletTransactionTone): string {
  if (tone === 'inflow') return styles.amountInflow;
  if (tone === 'outflow') return styles.amountOutflow;
  return styles.amountRecord;
}

interface WalletTransactionTableProps {
  activeTab: TxTabKey;
  records: WalletTransactionRecord[];
  loading: boolean;
  flashFirstRow: boolean;
  showOperatorColumn: boolean;
  current: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onTabChange: (key: TxTabKey) => void;
}

function WalletTransactionTable({
  activeTab,
  records,
  loading,
  flashFirstRow,
  showOperatorColumn,
  current,
  total,
  pageSize,
  onPageChange,
  onTabChange,
}: WalletTransactionTableProps) {
  const { t } = useTranslation('wallet');
  const dataSource = records.map((r) => ({
    ...r,
    key: `${r.traceId || 'tx'}-${r.type}-${r.time}-${r.amount}`,
  }));

  const columns = (() => {
    const baseColumns: Array<DataTableColumn<WalletTransactionRow>> = [
      {
        id: 'time',
        label: t('transaction.columns.time'),
        width: 'lg',
        align: 'start',
        renderCell: (row) => (
          <DataTable.TextCell className={styles.timeCell}>
            {formatTimestampToDateTime(row.time) || '—'}
          </DataTable.TextCell>
        ),
      },
      {
        id: 'type',
        label: t('transaction.columns.type'),
        width: 'sm',
        align: 'start',
        renderCell: (row) => {
          const tone = getTransactionTone(row.type);
          return (
            <Chip
              className={cn(styles.typeChip, getToneChipClassName(tone))}
              size="md"
              variant="soft"
            >
              {tone === 'record' ? (
                <ArrowRight size={14} />
              ) : tone === 'inflow' ? (
                <ArrowUp size={14} />
              ) : (
                <ArrowDown size={14} />
              )}
              <Chip.Label>{t(getTransactionKindKey(row.type))}</Chip.Label>
            </Chip>
          );
        },
      },
      {
        id: 'summary',
        label: t('transaction.columns.summary'),
        width: 'fill',
        align: 'start',
        renderCell: (row) => (
          <div className={styles.summaryBlock}>
            <div className={styles.summaryMain}>{t(getTransactionKindKey(row.type))}</div>
            <div className={styles.summarySub}>
              {row.remark ? normalizeMaskDisplayText(row.remark) : '—'}
            </div>
          </div>
        ),
      },
      {
        id: 'amount',
        label: t('transaction.columns.amount'),
        width: 'md',
        align: 'end',
        renderCell: (row) => {
          const amount = Number(row.amount);
          const prefix = amount > 0 ? '+' : '';
          const tone = getTransactionTone(row.type);
          return (
            <span className={cn(styles.amount, getToneAmountClassName(tone))}>
              {prefix}
              {formatCompactNumber(amount)}
            </span>
          );
        },
      },
    ];

    if (showOperatorColumn) {
      baseColumns.push({
        id: 'operatorName',
        label: t('transaction.columns.operator'),
        width: 'md',
        align: 'start',
        renderCell: (row) => (
          <DataTable.TextCell>
            {row.operatorName != null && row.operatorName.length > 0 ? row.operatorName : '—'}
          </DataTable.TextCell>
        ),
      });
    }

    return baseColumns;
  })() satisfies Array<DataTableColumn<WalletTransactionRow>>;

  const tabs = TX_TABS.map((tab) => ({ key: tab.key, label: t(tab.labelKey) }));

  return (
    <DataTable
      ariaLabel={t('transaction.aria')}
      className={styles.transactionTable}
      items={dataSource}
      rowKey="key"
      columns={columns}
      loading={loading}
      emptyText={t('transaction.empty')}
      title={t('transaction.title')}
      tabs={
        <DataTable.Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={onTabChange}
          ariaLabel={t('transaction.typeAria')}
        />
      }
      pagination={{
        total,
        current,
        pageSize,
        onChange: onPageChange,
      }}
      getRowClassName={(_, ctx) =>
        flashFirstRow && ctx.rowId === dataSource[0]?.key ? styles.rowFlash : undefined
      }
    />
  );
}

export default WalletTransactionTable;
