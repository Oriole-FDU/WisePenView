import { executeApiContract } from '@/apis/executeApiContract';

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

const serializeWalletTransactionsQuery = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && String(item) !== '') {
          searchParams.append(key, String(item));
        }
      });
      return;
    }
    searchParams.append(key, String(value));
  });
  return searchParams.toString();
};

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
    paramsSerializer: serializeWalletTransactionsQuery,
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
