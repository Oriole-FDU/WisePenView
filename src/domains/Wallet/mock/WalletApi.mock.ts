import { mockResponse } from '@/domains/_shared/mock/response';
import { getMockGroup } from '@/domains/Group/mock/GroupApi.mock';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { WalletApi as WalletApiContract } from '../apis/WalletApi';
import type {
  GetUserWalletInfoApiResponse,
  WalletTransactionRecordApiResponse,
} from '../apis/WalletApi.schema';
import mockdata from './mockdata.json';

let balance = Number(mockdata.tokenBalance);
const records: WalletTransactionRecordApiResponse[] = structuredClone(
  mockdata.transactions.records
).map((record) => ({
  traceId: record.traceId,
  operatorId: '1',
  count: record.count,
  walletTransactionType:
    record.walletTransactionType as WalletTransactionRecordApiResponse['walletTransactionType'],
  walletBusinessType:
    record.walletBusinessType as WalletTransactionRecordApiResponse['walletBusinessType'],
  meta: record.meta,
  billingDetail: null,
  operatorDisplay: {
    ...record.operatorDisplay,
    identityType: record.operatorDisplay.identityType as 1 | 2 | 3,
  },
  createTime: Date.parse(record.createTime),
}));
export const WalletApi: typeof WalletApiContract = {
  getUserWalletInfo: (): Promise<GetUserWalletInfoApiResponse> =>
    mockResponse({
      tokenBalance: balance,
      tokenUsed: mockdata.tokenUsed,
      coinBalance: 0,
    }),
  redeemVoucher: async ({ voucherCode }) => {
    const code = voucherCode.replace(/[\s-]/g, '').toUpperCase();
    if (code.length !== 16)
      throw createClientError(FRONTEND_CLIENT_ERROR.WALLET_VOUCHER_CODE_INVALID);
    if (code === '0000000000000000')
      throw createClientError(FRONTEND_CLIENT_ERROR.WALLET_VOUCHER_USED);
    if (code === 'FFFFFFFFFFFFFFFF')
      throw createClientError(FRONTEND_CLIENT_ERROR.WALLET_VOUCHER_INVALID);
    balance += 500;
    records.unshift({
      traceId: `mock-${crypto.randomUUID()}`,
      operatorId: '1',
      billingDetail: null,
      createTime: Date.now(),
      walletTransactionType: 'REFILL',
      walletBusinessType: 'TOKEN',
      count: 500,
      meta: `****${code.slice(-4)}`,
      operatorDisplay: {
        nickname: '示例用户',
        username: 'mock-user',
        avatar: null,
        identityType: 1,
        realName: '示例用户',
        campusNo: '20250000',
        email: null,
        mobile: null,
      },
    });
  },
  listTransactions: (params) => {
    const transactionTypes = params.walletTransactionTypes ?? [];
    const rows = records.filter((r) => {
      if (params.walletBusinessType && r.walletBusinessType !== params.walletBusinessType) {
        return false;
      }
      return (
        transactionTypes.length === 0 ||
        (r.walletTransactionType != null && transactionTypes.includes(r.walletTransactionType))
      );
    });
    const page = Number(params.page ?? 1);
    const size = Number(params.size ?? 20);
    return mockResponse({
      list: rows.slice((page - 1) * size, page * size),
      total: rows.length,
      page,
      size,
      totalPage: size === 0 ? 0 : Math.ceil(rows.length / size),
    });
  },
  transferTokenBetweenGroupAndUser: async ({ groupId, tokenCount, tokenTransferType }) => {
    const group = getMockGroup(groupId);
    const groupBalance = Number(group.tokenBalance ?? 0);
    const isGroupInflow = tokenTransferType === 'GROUP_INFLOW';
    if (
      !Number.isFinite(tokenCount) ||
      tokenCount <= 0 ||
      (isGroupInflow ? balance : groupBalance) < tokenCount
    ) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'tokenCount' });
    }
    const amount = isGroupInflow ? -tokenCount : tokenCount;
    balance += amount;
    group.tokenBalance = groupBalance - amount;
  },
};
