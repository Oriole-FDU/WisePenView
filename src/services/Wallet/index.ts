/** 对外仅导出类型；实现放在 WalletServices.impl / Mock，由 ServicesContext 注入 */
export type {
  IWalletService,
  GetWalletInfoRequest,
  GetWalletInfoResponse,
  RedeemVoucherRequest,
  ListWalletTransactionsRequest,
  ListWalletTransactionsResponse,
  GiveTokenToGroupRequest,
  GiveTokenToOwnerRequest,
} from './index.type';
