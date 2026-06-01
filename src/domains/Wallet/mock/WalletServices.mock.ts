/**
 * 钱包 Mock：MODE === 'mock'；接口形态与 /user/wallet 对齐。
 */
import type { IWalletService, WalletTransactionRecord } from '@/domains/Wallet';
import { WALLET_TX_TAB_MERGE_FETCH_CAP } from '@/domains/Wallet';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let mockPersonalBalance = Number(mockdata.tokenBalance) || 0;
let mockGroupBalance = 800;
const mockTokenUsed = Number(mockdata.tokenUsed) || 0;
const allRecords = [...(mockdata.transactions.records as WalletTransactionRecord[])];

const getUserWalletInfo: IWalletService['getUserWalletInfo'] = async () => {
  await delay(280);
  return {
    tokenBalance: mockPersonalBalance,
    tokenUsed: mockTokenUsed,
    balance: mockPersonalBalance,
  };
};

const redeemVoucher: IWalletService['redeemVoucher'] = async (params) => {
  await delay(400);
  const code = params.voucherCode.replace(/[\s-]/g, '').toUpperCase();
  if (code.length !== 16) {
    throw createClientError(FRONTEND_CLIENT_ERROR.WALLET_VOUCHER_CODE_INVALID);
  }
  if (code === '0000000000000000') {
    throw createClientError(FRONTEND_CLIENT_ERROR.WALLET_VOUCHER_USED);
  }
  if (code === 'FFFFFFFFFFFFFFFF') {
    throw createClientError(FRONTEND_CLIENT_ERROR.WALLET_VOUCHER_INVALID);
  }
  const amount = 500;
  mockPersonalBalance += amount;
  const traceId = `mock-${Date.now()}`;
  allRecords.unshift({
    traceId,
    time: new Date().toISOString().slice(0, 19).replace('T', ' '),
    type: 'RECHARGE',
    amount,
    title: '充值',
    subTitle: `****${code.slice(-4)}`,
    operatorName: '我',
  });
};

const listTransactions: IWalletService['listTransactions'] = async (params) => {
  await delay(260);
  const { page = 1, size = 20, type: typeParam } = params;
  let rows = [...allRecords];
  if (typeParam === 1) {
    rows = rows.filter((r) => r.type === 'RECHARGE');
  } else if (typeParam === 2) {
    rows = rows.filter((r) => r.type === 'SPEND');
  } else if (typeParam === 3) {
    rows = rows.filter((r) => r.type === 'TRANSFER_IN');
  } else if (typeParam === 4) {
    rows = rows.filter((r) => r.type === 'TRANSFER_OUT');
  }
  const start = (page - 1) * size;
  const slice = rows.slice(start, start + size);
  return { total: rows.length, records: slice };
};

const txRecordDedupeKey = (r: WalletTransactionRecord): string =>
  r.traceId.length > 0 ? r.traceId : `${r.time}\u0000${r.type}\u0000${r.amount}`;

const compareWalletTxTimeDesc = (a: WalletTransactionRecord, b: WalletTransactionRecord): number =>
  String(b.time).localeCompare(String(a.time));

const listMergedTransactions: IWalletService['listMergedTransactions'] = async (params) => {
  await delay(260);
  const { page = 1, size = 20, typeA, typeB } = params;
  const cap = WALLET_TX_TAB_MERGE_FETCH_CAP;
  const [ra, rb] = await Promise.all([
    listTransactions({ ...params, page: 1, size: cap, type: typeA }),
    listTransactions({ ...params, page: 1, size: cap, type: typeB }),
  ]);
  const map = new Map<string, WalletTransactionRecord>();
  for (const r of ra.records) map.set(txRecordDedupeKey(r), r);
  for (const r of rb.records) map.set(txRecordDedupeKey(r), r);
  const merged = [...map.values()].sort(compareWalletTxTimeDesc);
  const total = ra.total + rb.total;
  const start = (page - 1) * size;
  return { total, records: merged.slice(start, start + size) };
};

const transferTokenBetweenGroupAndUser: IWalletService['transferTokenBetweenGroupAndUser'] = async (
  params
) => {
  await delay(200);
  const n = params.tokenCount;
  if (params.tokenTransferType === 1) {
    mockPersonalBalance = Math.max(0, mockPersonalBalance - n);
    mockGroupBalance += n;
  } else {
    mockGroupBalance = Math.max(0, mockGroupBalance - n);
    mockPersonalBalance += n;
  }
};

export const WalletServicesMock: IWalletService = {
  getUserWalletInfo,
  redeemVoucher,
  listTransactions,
  listMergedTransactions,
  transferTokenBetweenGroupAndUser,
};
