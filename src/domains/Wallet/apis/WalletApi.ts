import { executeApiContract } from '@/apis/executeApiContract';
import { serializeQueryParams } from '@/apis/serializeQueryParams';

import {
  GetUserWalletInfoApiContract,
  type GetUserWalletInfoApiContractResponse,
  ListTransactionsApiContract,
  type ListTransactionsApiContractRequest,
  type ListTransactionsApiContractResponse,
  RedeemVoucherApiContract,
  type RedeemVoucherApiContractRequest,
  TransferTokenBetweenGroupAndUserApiContract,
  type TransferTokenBetweenGroupAndUserApiContractRequest,
} from './WalletApi.contract';

/** User Wallet API: /user/wallet/* */

function getUserWalletInfo(): Promise<GetUserWalletInfoApiContractResponse> {
  return executeApiContract(GetUserWalletInfoApiContract, undefined);
}

async function redeemVoucher(req: RedeemVoucherApiContractRequest): Promise<void> {
  await executeApiContract(RedeemVoucherApiContract, req);
}

function listTransactions(
  req: ListTransactionsApiContractRequest
): Promise<ListTransactionsApiContractResponse> {
  return executeApiContract(ListTransactionsApiContract, req, {
    paramsSerializer: serializeQueryParams,
  });
}

async function transferTokenBetweenGroupAndUser(
  req: TransferTokenBetweenGroupAndUserApiContractRequest
): Promise<void> {
  await executeApiContract(TransferTokenBetweenGroupAndUserApiContract, req);
}

export const WalletApi = {
  getUserWalletInfo,
  redeemVoucher,
  listTransactions,
  transferTokenBetweenGroupAndUser,
};
