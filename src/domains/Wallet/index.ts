/** 对外仅导出类型；实现放在 WalletServices.impl / Mock，由 ServicesContext 注入 */
export type { WalletTransactionKind, WalletTransactionRecord } from './entity/wallet';
export { WALLET_TRANSACTION_KIND } from './entity/wallet';
export type { WalletTargetType } from './enum';
export type { WalletBusinessType, WalletTokenTransferType } from './enum';
export { WALLET_BUSINESS_TYPE, WALLET_TARGET_TYPE, WALLET_TOKEN_TRANSFER_TYPE } from './enum';
export type {
  GetWalletInfoResponse,
  IWalletService,
  ListWalletTransactionsRequest,
  ListWalletTransactionsResponse,
  RedeemVoucherRequest,
  TransferTokenBetweenGroupAndUserRequest,
} from './service/index.type';
