/**
 * 钱包 Service：/user/wallet/*，成功码与全局一致 `code === 200`。
 */
import { WALLET_TX_TAB_MERGE_FETCH_CAP, type WalletTransactionRecord } from '@/domains/Wallet';
import { UserWalletApi } from '@domain-apis';
import { WalletServicesMap } from '../mapper/WalletServices.map';
import type {
  GetWalletInfoResponse,
  IWalletService,
  ListMergedWalletTransactionsRequest,
  ListWalletTransactionsRequest,
  ListWalletTransactionsResponse,
  RedeemVoucherRequest,
  TransferTokenBetweenGroupAndUserRequest,
} from './index.type';

const getUserWalletInfo = async (): Promise<GetWalletInfoResponse> => {
  const data = await UserWalletApi.getUserWalletInfo();
  return WalletServicesMap.mapGetUserWalletInfoFromApi(data);
};

const redeemVoucher = async (params: RedeemVoucherRequest): Promise<void> => {
  const payload = WalletServicesMap.mapRedeemVoucherRequest(params);
  await UserWalletApi.redeemVoucher(payload);
};

const listTransactions = async (
  params: ListWalletTransactionsRequest
): Promise<ListWalletTransactionsResponse> => {
  const query = WalletServicesMap.mapListTransactionsRequest(params);
  const data = await UserWalletApi.listTransactions(query);
  return WalletServicesMap.mapListTransactionsFromApi(data);
};

const txRecordDedupeKey = (record: WalletTransactionRecord): string =>
  record.traceId.length > 0
    ? record.traceId
    : `${record.time}\u0000${record.type}\u0000${record.amount}`;

const compareWalletTxTimeDesc = (a: WalletTransactionRecord, b: WalletTransactionRecord): number =>
  String(b.time).localeCompare(String(a.time));

const listMergedTransactions = async (
  params: ListMergedWalletTransactionsRequest
): Promise<ListWalletTransactionsResponse> => {
  const { groupId, page = 1, size = 20, typeA, typeB } = params;
  const cap = WALLET_TX_TAB_MERGE_FETCH_CAP;
  const [ra, rb] = await Promise.all([
    listTransactions({ groupId, page: 1, size: cap, type: typeA }),
    listTransactions({ groupId, page: 1, size: cap, type: typeB }),
  ]);
  const map = new Map<string, WalletTransactionRecord>();
  for (const record of ra.records) map.set(txRecordDedupeKey(record), record);
  for (const record of rb.records) map.set(txRecordDedupeKey(record), record);
  const merged = [...map.values()].sort(compareWalletTxTimeDesc);
  const total = ra.total + rb.total;
  const start = (page - 1) * size;
  return { total, records: merged.slice(start, start + size) };
};

const transferTokenBetweenGroupAndUser = async (
  params: TransferTokenBetweenGroupAndUserRequest
): Promise<void> => {
  const payload = WalletServicesMap.mapTransferTokenBetweenGroupAndUserRequest(params);
  await UserWalletApi.transferTokenBetweenGroupAndUser(payload);
};

export const createWalletServices = (): IWalletService => ({
  getUserWalletInfo,
  redeemVoucher,
  listTransactions,
  listMergedTransactions,
  transferTokenBetweenGroupAndUser,
});
