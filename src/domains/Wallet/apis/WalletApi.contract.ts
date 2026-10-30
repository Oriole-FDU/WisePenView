import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiRequestSchema, EmptyApiResponseSchema } from '@/apis/schema';

import {
  GetUserWalletInfoApiResponseSchema,
  ListTransactionsApiRequestSchema,
  ListTransactionsApiResponseSchema,
  RedeemVoucherApiRequestSchema,
  TransferTokenBetweenGroupAndUserApiRequestSchema,
} from './WalletApi.schema';

export const GetUserWalletInfoApiContract = defineApiContract({
  name: 'GetUserWalletInfoApi',
  method: 'GET',
  endpoint: '/user/wallet/getUserWalletInfo',
  requestPlacement: 'none',
  transport: 'json',
  request: EmptyApiRequestSchema,
  response: GetUserWalletInfoApiResponseSchema,
});

export const RedeemVoucherApiContract = defineApiContract({
  name: 'RedeemVoucherApi',
  method: 'POST',
  endpoint: '/user/wallet/redeemVoucher',
  requestPlacement: 'body',
  transport: 'json',
  request: RedeemVoucherApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ListTransactionsApiContract = defineApiContract({
  name: 'ListTransactionsApi',
  method: 'GET',
  endpoint: '/user/wallet/listTransactions',
  requestPlacement: 'query',
  transport: 'json',
  request: ListTransactionsApiRequestSchema,
  response: ListTransactionsApiResponseSchema,
});

export const TransferTokenBetweenGroupAndUserApiContract = defineApiContract({
  name: 'TransferTokenBetweenGroupAndUserApi',
  method: 'POST',
  endpoint: '/user/wallet/transferTokenBetweenGroupAndUser',
  requestPlacement: 'body',
  transport: 'json',
  request: TransferTokenBetweenGroupAndUserApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export type GetUserWalletInfoApiContractResponse = ApiContractResponse<
  typeof GetUserWalletInfoApiContract
>;
export type RedeemVoucherApiContractRequest = ApiContractRequest<typeof RedeemVoucherApiContract>;
export type ListTransactionsApiContractRequest = ApiContractRequest<
  typeof ListTransactionsApiContract
>;
export type ListTransactionsApiContractResponse = ApiContractResponse<
  typeof ListTransactionsApiContract
>;
export type TransferTokenBetweenGroupAndUserApiContractRequest = ApiContractRequest<
  typeof TransferTokenBetweenGroupAndUserApiContract
>;
