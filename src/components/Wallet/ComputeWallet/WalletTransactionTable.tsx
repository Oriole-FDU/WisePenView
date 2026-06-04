import { WALLET_TRANSACTION_KIND, type WalletTransactionRecord } from '@/domains/Wallet';
import { formatCompactNumber } from '@/utils/format/formatNumber';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { Chip, Table, Tabs } from '@heroui/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMemo } from 'react';
import styles from './style.module.less';
import { isInflowKind, normalizeMaskDisplayText, TX_TABS, type TxTabKey } from './walletHelpers';

type WalletTransactionRow = WalletTransactionRecord & { key: string };

interface WalletTransactionTableProps {
  activeTab: TxTabKey;
  records: WalletTransactionRecord[];
  loading: boolean;
  flashFirstRow: boolean;
  showOperatorColumn: boolean;
  onTabChange: (key: TxTabKey) => void;
}

function WalletTransactionTable({
  activeTab,
  records,
  loading,
  flashFirstRow,
  showOperatorColumn,
  onTabChange,
}: WalletTransactionTableProps) {
  const dataSource = useMemo(
    () =>
      records.map((r) => ({
        ...r,
        key: String(r.traceId || r.time),
      })),
    [records]
  );

  return (
    <>
      <h3 className={styles.panelTitle}>交易明细</h3>
      <Tabs
        className={styles.tabs}
        selectedKey={activeTab}
        onSelectionChange={(key) => onTabChange(String(key) as TxTabKey)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="交易明细类型">
            {TX_TABS.map((tab) => (
              <Tabs.Tab key={tab.key} id={tab.key}>
                {tab.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="交易明细" className={styles.tableContent}>
            <Table.Header>
              <Table.Column id="time">时间</Table.Column>
              <Table.Column id="type">类型</Table.Column>
              <Table.Column id="summary">摘要 / 备注</Table.Column>
              <Table.Column id="amount" className={styles.amountColumn}>
                变动金额
              </Table.Column>
              {showOperatorColumn ? <Table.Column id="operatorName">操作人</Table.Column> : null}
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <div className={styles.empty}>{loading ? '加载中...' : '暂无交易明细'}</div>
              )}
            >
              {dataSource.map((row: WalletTransactionRow, index) => {
                const inflow = isInflowKind(row.type);
                const amount = Number(row.amount);
                const prefix = amount > 0 ? '+' : '';
                return (
                  <Table.Row
                    key={row.key}
                    id={row.key}
                    className={flashFirstRow && index === 0 ? styles.rowFlash : undefined}
                    textValue={`${formatTimestampToDateTime(row.time) || ''} ${row.title || ''}`}
                  >
                    <Table.Cell className={styles.timeCell}>
                      {formatTimestampToDateTime(row.time) || '—'}
                    </Table.Cell>
                    <Table.Cell>
                      <Chip
                        className={styles.typeChip}
                        color={inflow ? 'success' : 'danger'}
                        size="md"
                        variant="soft"
                      >
                        {inflow ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        <Chip.Label>{WALLET_TRANSACTION_KIND.getLabel(row.type)}</Chip.Label>
                      </Chip>
                    </Table.Cell>
                    <Table.Cell>
                      <div>
                        <div className={styles.summaryMain}>{row.title || '—'}</div>
                        <div className={styles.summarySub}>
                          {row.subTitle ? normalizeMaskDisplayText(row.subTitle) : '—'}
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell className={styles.amountCell}>
                      <span className={inflow ? styles.amountRecharge : styles.amountSpend}>
                        {prefix}
                        {formatCompactNumber(amount)}
                      </span>
                    </Table.Cell>
                    {showOperatorColumn ? (
                      <Table.Cell>
                        {row.operatorName != null && row.operatorName.length > 0
                          ? row.operatorName
                          : '—'}
                      </Table.Cell>
                    ) : null}
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </>
  );
}

export default WalletTransactionTable;
