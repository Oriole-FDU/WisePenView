import {
  WALLET_TOKEN_TX_TYPE,
  WALLET_TRANSACTION_KIND,
  type WalletTransactionKind,
} from '@/domains/Wallet';

export const PAGE_SIZE = 20;

export type TxTabKey = 'all' | 'recharge' | 'spend';

export const TX_TABS: { key: TxTabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'recharge', label: '充值' },
  { key: 'spend', label: '消费' },
];

export const tabToListType = (key: TxTabKey): number | undefined => {
  if (key === 'recharge') return WALLET_TOKEN_TX_TYPE.REFILL;
  if (key === 'spend') return WALLET_TOKEN_TX_TYPE.SPEND;
  return undefined;
};

export const isInflowKind = (k: WalletTransactionKind): boolean =>
  k === WALLET_TRANSACTION_KIND.RECHARGE || k === WALLET_TRANSACTION_KIND.TRANSFER_IN;

/** 掩码行展示：全角 *、- 与半角混排时视觉大小不一，先规范再交给 summarySub 等宽样式 */
export const normalizeMaskDisplayText = (s: string): string =>
  s.replace(/\uFF0A/g, '*').replace(/\uFF0D/g, '-');
