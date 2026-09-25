import { WALLET_TRANSACTION_KIND, type WalletTransactionKind } from '@/domains/Wallet';

export const PAGE_SIZE = 20;

export type TxTabKey = 'all' | 'income' | 'spend' | 'record';

export const TX_TABS: { key: TxTabKey; labelKey: string }[] = [
  { key: 'all', labelKey: 'transaction.tabs.all' },
  { key: 'income', labelKey: 'transaction.tabs.income' },
  { key: 'spend', labelKey: 'transaction.tabs.spend' },
  { key: 'record', labelKey: 'transaction.tabs.record' },
];

export const tabToTransactionTypes = (key: TxTabKey): WalletTransactionKind[] | undefined => {
  if (key === 'income') {
    return [
      WALLET_TRANSACTION_KIND.REFILL,
      WALLET_TRANSACTION_KIND.TRANSFER_IN,
      WALLET_TRANSACTION_KIND.INCOME,
      WALLET_TRANSACTION_KIND.EXCHANGE,
      WALLET_TRANSACTION_KIND.REVERSE,
      WALLET_TRANSACTION_KIND.GIFT,
    ];
  }
  if (key === 'spend') return [WALLET_TRANSACTION_KIND.SPEND, WALLET_TRANSACTION_KIND.TRANSFER_OUT];
  if (key === 'record') return [WALLET_TRANSACTION_KIND.ONLY_RECORD_META];
  return undefined;
};

export const isInflowKind = (k: WalletTransactionKind): boolean =>
  k === WALLET_TRANSACTION_KIND.REFILL ||
  k === WALLET_TRANSACTION_KIND.TRANSFER_IN ||
  k === WALLET_TRANSACTION_KIND.INCOME ||
  k === WALLET_TRANSACTION_KIND.EXCHANGE ||
  k === WALLET_TRANSACTION_KIND.REVERSE ||
  k === WALLET_TRANSACTION_KIND.GIFT;

export const isNeutralKind = (k: WalletTransactionKind): boolean =>
  k === WALLET_TRANSACTION_KIND.ONLY_RECORD_META;

/** 掩码行展示：全角 *、- 与半角混排时视觉大小不一，先规范再交给 summarySub 等宽样式 */
export const normalizeMaskDisplayText = (s: string): string =>
  s.replace(/\uFF0A/g, '*').replace(/\uFF0D/g, '-');
