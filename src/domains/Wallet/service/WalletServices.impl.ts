/**
 * 钱包 Service：/user/wallet/*，成功码与全局一致 `code === 200`。
 */
import { WalletApi } from '@domain-apis';

import { WalletServicesMap } from '../mapper/WalletServices.map';
import type {
  GetWalletInfoResponse,
  IWalletService,
  ListWalletTransactionsRequest,
  ListWalletTransactionsResponse,
  RedeemVoucherRequest,
  TransferTokenBetweenGroupAndUserRequest,
} from './index.type';

const getUserWalletInfo = async (): Promise<GetWalletInfoResponse> => {
  const data = await WalletApi.getUserWalletInfo();
  return WalletServicesMap.mapGetUserWalletInfoFromApi(data);
};

const redeemVoucher = async (params: RedeemVoucherRequest): Promise<void> => {
  const payload = WalletServicesMap.mapRedeemVoucherRequest(params);
  await WalletApi.redeemVoucher(payload);
};

const listTransactions = async (
  params: ListWalletTransactionsRequest
): Promise<ListWalletTransactionsResponse> => {
  const query = WalletServicesMap.mapListTransactionsRequest(params);
  const data = await WalletApi.listTransactions(query);
  return WalletServicesMap.mapListTransactionsFromApi(data);
};

const transferTokenBetweenGroupAndUser = async (
  params: TransferTokenBetweenGroupAndUserRequest
): Promise<void> => {
  const payload = WalletServicesMap.mapTransferTokenBetweenGroupAndUserRequest(params);
  await WalletApi.transferTokenBetweenGroupAndUser(payload);
};

export const createWalletServices = (): IWalletService => ({
  getUserWalletInfo,
  redeemVoucher,
  listTransactions,
  transferTokenBetweenGroupAndUser,
});
