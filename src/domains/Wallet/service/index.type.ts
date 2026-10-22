import type {
  WalletBusinessType,
  WalletTokenTransferType,
  WalletTransactionKind,
  WalletTransactionRecord,
} from '@/domains/Wallet';

/**
 * IWalletService：/user/wallet 下个人钱包、流水、点卡兑换（仅本人）、组长↔小组划拨。
 */

/** GET /user/wallet/getUserWalletInfo — 无参读取当前用户余额；小组资金池余额由 GroupService 读取。 */
export interface GetWalletInfoResponse {
  tokenBalance: number;
  tokenUsed: number;
  balance: number;
}

/** POST /user/wallet/redeemVoucher — 仅兑换到当前登录用户 */
export interface RedeemVoucherRequest {
  voucherCode: string;
}

/** POST /user/wallet/transferTokenBetweenGroupAndUser */
export interface TransferTokenBetweenGroupAndUserRequest {
  groupId: number | string;
  tokenCount: number;
  tokenTransferType: WalletTokenTransferType;
}

/** GET /user/wallet/listTransactions — groupId 空则查用户流水 */
export interface ListWalletTransactionsRequest {
  groupId?: string | number | null;
  page?: number;
  size?: number;
  /** 不传：不按交易类型筛选 */
  transactionTypes?: WalletTransactionKind[];
  /** 不传：不按业务类型筛选 */
  businessType?: WalletBusinessType;
}

export interface ListWalletTransactionsResponse {
  total: number;
  records: WalletTransactionRecord[];
}

export interface IWalletService {
  getUserWalletInfo(): Promise<GetWalletInfoResponse>;
  redeemVoucher(params: RedeemVoucherRequest): Promise<void>;
  listTransactions(params: ListWalletTransactionsRequest): Promise<ListWalletTransactionsResponse>;
  transferTokenBetweenGroupAndUser(params: TransferTokenBetweenGroupAndUserRequest): Promise<void>;
}
