import type { Nullable, OptionalPageApiRequest, PageR } from '@/apis/api.type';
import type { UserDisplayBaseApiResponse } from '@/domains/User/apis/UserApi.type';

export interface RedeemVoucherApiRequest {
  voucherCode: string;
}

export interface GetUserWalletInfoApiResponse {
  tokenBalance: number;
  tokenUsed: number;
  coinBalance: number;
}

export type WalletTransactionTypeApiValue =
  | 'REFILL'
  | 'SPEND'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'INCOME'
  | 'EXCHANGE'
  | 'REVERSE'
  | 'GIFT'
  | 'ONLY_RECORD_META';

export type WalletBusinessTypeApiValue = 'TOKEN' | 'COIN';

export interface WalletTransactionRecordApiResponse {
  traceId: string;
  operatorId: Nullable<string>;
  count: number;
  walletTransactionType: WalletTransactionTypeApiValue;
  walletBusinessType: WalletBusinessTypeApiValue;
  meta: Nullable<string>;
  billingDetail: Nullable<string>;
  operatorDisplay: Nullable<UserDisplayBaseApiResponse>;
  createTime: number;
}

export interface ListTransactionsApiRequest extends OptionalPageApiRequest {
  groupId?: string;
  walletTransactionTypes?: WalletTransactionTypeApiValue[];
  walletBusinessType?: WalletBusinessTypeApiValue;
}

export type ListTransactionsApiResponse = PageR<WalletTransactionRecordApiResponse>;

export type TokenTransferTypeApiValue = 'GROUP_INFLOW' | 'USER_INFLOW';

export interface TransferTokenBetweenGroupAndUserApiRequest {
  groupId: string;
  tokenCount: number;
  tokenTransferType: TokenTransferTypeApiValue;
}
