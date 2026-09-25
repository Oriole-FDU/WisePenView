/**
 * 钱包流水领域类型；由 /user/wallet/listTransactions 的 list 项映射。
 */
import type { EnumValue } from '@/utils/type/enum';
import { createEnum } from '@/utils/type/enum';

/** 展示用分类（含小组划拨流水） */
export const WALLET_TRANSACTION_KIND = createEnum([
  { value: 'REFILL', key: 'REFILL', label: '充值' },
  { value: 'SPEND', key: 'SPEND', label: '消费' },
  { value: 'TRANSFER_IN', key: 'TRANSFER_IN', label: '划入' },
  { value: 'TRANSFER_OUT', key: 'TRANSFER_OUT', label: '划出' },
  { value: 'INCOME', key: 'INCOME', label: '收入' },
  { value: 'EXCHANGE', key: 'EXCHANGE', label: '兑换' },
  { value: 'REVERSE', key: 'REVERSE', label: '冲正' },
  { value: 'GIFT', key: 'GIFT', label: '奖励' },
  { value: 'ONLY_RECORD_META', key: 'ONLY_RECORD_META', label: '记录' },
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
