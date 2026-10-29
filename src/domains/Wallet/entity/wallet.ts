/**
 * 钱包流水领域类型；由 /user/wallet/listTransactions 的 list 项映射。
 */
import type { EnumValue } from '@/utils/type/enum';
import { defineEnum } from '@/utils/type/enum';

/** 展示用分类（含小组划拨流水） */
export const WALLET_TRANSACTION_KIND = defineEnum([
  'REFILL',
  'SPEND',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'INCOME',
  'EXCHANGE',
  'REVERSE',
  'GIFT',
  'ONLY_RECORD_META',
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
