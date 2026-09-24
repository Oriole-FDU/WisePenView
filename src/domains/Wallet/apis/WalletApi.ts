import { apiGet, apiPost } from '@/apis/request';

import type {
  ListTransactionsApiRequest,
  ListTransactionsApiResponse,
  RedeemVoucherApiRequest,
  TransferTokenBetweenGroupAndUserApiRequest,
} from './WalletApi.type';

/** User Wallet API: /user/wallet/* */

const serializeWalletTransactionsQuery = (params: ListTransactionsApiRequest): string => {
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

function getUserWalletInfo(): Promise<Record<string, unknown>> {
  return apiGet('/user/wallet/getUserWalletInfo');
}

function redeemVoucher(req: RedeemVoucherApiRequest): Promise<void> {
  return apiPost('/user/wallet/redeemVoucher', req);
}

function listTransactions(req: ListTransactionsApiRequest): Promise<ListTransactionsApiResponse> {
  return apiGet('/user/wallet/listTransactions', {
    params: req,
    paramsSerializer: serializeWalletTransactionsQuery,
  });
}

function transferTokenBetweenGroupAndUser(
  req: TransferTokenBetweenGroupAndUserApiRequest
): Promise<void> {
  return apiPost('/user/wallet/transferTokenBetweenGroupAndUser', req);
}

export const WalletApi = {
  getUserWalletInfo,
  redeemVoucher,
  listTransactions,
  transferTokenBetweenGroupAndUser,
};
