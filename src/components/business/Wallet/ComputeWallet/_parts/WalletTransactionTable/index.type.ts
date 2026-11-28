import type { WalletTransactionRecord } from '@/domains/Wallet';

import type { TxTabKey } from '../../_common/walletHelpers';

export interface WalletTransactionTableProps {
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
