/** 对外仅导出类型；实现放在 WalletServices.impl / Mock，由 ServicesContext 注入 */
export type { GroupQuotaInfo, UserGroupQuota } from './entity/quota';
export { WALLET_TRANSACTION_KIND } from './entity/wallet';
export type { WalletTransactionKind, WalletTransactionRecord } from './entity/wallet';
export {
  WALLET_TARGET_TYPE,
  WALLET_TOKEN_TRANSFER_TYPE,
  WALLET_TOKEN_TX_TYPE,
  WALLET_TX_TAB_MERGE_FETCH_CAP,
} from './enum';
export type { WalletTargetType } from './enum';
export type {
  GetWalletInfoResponse,
  IWalletService,
  ListMergedWalletTransactionsRequest,
  ListWalletTransactionsRequest,
  ListWalletTransactionsResponse,
  RedeemVoucherRequest,
  TransferTokenBetweenGroupAndUserRequest,
} from './service/index.type';
