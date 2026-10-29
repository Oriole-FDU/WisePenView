/**
 * 钱包流水领域类型；由 /user/wallet/listTransactions 的 list 项映射。
 */
import type { EnumValue } from '@/utils/type/enum';
import { createEnum } from '@/utils/type/enum';

/** 展示用分类（含小组划拨流水） */
export const WALLET_TRANSACTION_KIND = createEnum([
  { value: 'REFILL', key: 'REFILL' },
  { value: 'SPEND', key: 'SPEND' },
  { value: 'TRANSFER_IN', key: 'TRANSFER_IN' },
  { value: 'TRANSFER_OUT', key: 'TRANSFER_OUT' },
  { value: 'INCOME', key: 'INCOME' },
  { value: 'EXCHANGE', key: 'EXCHANGE' },
  { value: 'REVERSE', key: 'REVERSE' },
  { value: 'GIFT', key: 'GIFT' },
  { value: 'ONLY_RECORD_META', key: 'ONLY_RECORD_META' },
] as const);

export type WalletTransactionKind = EnumValue<typeof WALLET_TRANSACTION_KIND>;

/**
 * 接口：traceId、count、walletTransactionType、walletBusinessType、meta、operatorDisplay、createTime。
 */
export interface WalletTransactionRecord {
  traceId: string;
  time: string;
  type: WalletTransactionKind;
  amount: number;
  remark: string;
  operatorName?: string;
}
