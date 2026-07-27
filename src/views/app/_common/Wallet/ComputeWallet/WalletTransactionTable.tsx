import { DataTable, type DataTableColumn } from '@/components/Table';
import { WALLET_TRANSACTION_KIND, type WalletTransactionRecord } from '@/domains/Wallet';
import { formatCompactNumber } from '@/utils/format/formatNumber';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { Chip } from '@heroui/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';
import { isInflowKind, normalizeMaskDisplayText, TX_TABS, type TxTabKey } from './walletHelpers';

type WalletTransactionRow = WalletTransactionRecord & { key: string };

function getTransactionKindKey(kind: WalletTransactionRecord['type']): string {
  switch (kind) {
    case WALLET_TRANSACTION_KIND.RECHARGE:
      return 'transaction.kind.recharge';
    case WALLET_TRANSACTION_KIND.SPEND:
      return 'transaction.kind.spend';
    case WALLET_TRANSACTION_KIND.TRANSFER_IN:
      return 'transaction.kind.transferIn';
    case WALLET_TRANSACTION_KIND.TRANSFER_OUT:
      return 'transaction.kind.transferOut';
  }
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
    key: String(r.traceId || r.time),
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
          const inflow = isInflowKind(row.type);
          return (
            <Chip
              className={styles.typeChip}
              color={inflow ? 'success' : 'danger'}
              size="md"
              variant="soft"
            >
              {inflow ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
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
            <div className={styles.summaryMain}>
              {row.title || t(getTransactionKindKey(row.type))}
            </div>
            <div className={styles.summarySub}>
              {row.subTitle ? normalizeMaskDisplayText(row.subTitle) : '—'}
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
          const inflow = isInflowKind(row.type);
          const amount = Number(row.amount);
          const prefix = amount > 0 ? '+' : '';
          return (
            <span className={inflow ? styles.amountRecharge : styles.amountSpend}>
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
