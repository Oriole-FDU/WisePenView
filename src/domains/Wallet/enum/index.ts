import type { EnumValue } from '@/utils/type/enum';
import { createEnum } from '@/utils/type/enum';

/**
 * 钱包展示主体（仅前端区分个人 / 小组 Tab，接口统一走 /user/wallet）。
 */
export const WALLET_TARGET_TYPE = createEnum([
  { value: 1, key: 'USER' },
  { value: 2, key: 'GROUP' },
] as const);
export type WalletTargetType = EnumValue<typeof WALLET_TARGET_TYPE>;

/**
 * listTransactions 可选 walletBusinessType。
 */
export const WALLET_BUSINESS_TYPE = createEnum([
  { value: 'TOKEN', key: 'TOKEN' },
  { value: 'COIN', key: 'COIN' },
] as const);
export type WalletBusinessType = EnumValue<typeof WALLET_BUSINESS_TYPE>;

/** Owner<->Group 划拨：GROUP_INFLOW 转入小组，USER_INFLOW 转回组长 */
export const WALLET_TOKEN_TRANSFER_TYPE = createEnum([
  { value: 'GROUP_INFLOW', key: 'GROUP_INFLOW' },
  { value: 'USER_INFLOW', key: 'USER_INFLOW' },
] as const);
export type WalletTokenTransferType = EnumValue<typeof WALLET_TOKEN_TRANSFER_TYPE>;
