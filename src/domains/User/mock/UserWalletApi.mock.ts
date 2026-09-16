import { mockResponse } from '@/domains/_shared/mock/response';
import { getMockGroup } from '@/domains/Group/mock/GroupApi.mock';
import mockdata from '@/domains/Wallet/mock/mockdata.json';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import type { UserWalletApi as UserWalletApiContract } from '../apis/UserApi';

let balance = mockdata.tokenBalance;
const records = structuredClone(mockdata.transactions.records);
export const UserWalletApi: typeof UserWalletApiContract = {
  getUserWalletInfo: () => mockResponse({ tokenBalance: balance, tokenUsed: mockdata.tokenUsed }),
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
      createTime: new Date().toISOString(),
      tokenTransactionType: 'REFILL',
      tokenCount: 500,
      title: '充值',
      subTitle: `****${code.slice(-4)}`,
      operatorName: '示例用户',
    });
  },
  listTransactions: (params) => {
    const rows = records.filter((r) => !params.type || r.tokenTransactionType === params.type);
    const page = Number(params.page ?? 1);
    const size = Number(params.size ?? 20);
    return mockResponse({ list: rows.slice((page - 1) * size, page * size), total: rows.length });
  },
  transferTokenBetweenGroupAndUser: async ({ groupId, tokenCount, tokenTransferType }) => {
    const group = getMockGroup(groupId);
    const groupBalance = Number(group.tokenBalance ?? 0);
    if (
      !Number.isFinite(tokenCount) ||
      tokenCount <= 0 ||
      (tokenTransferType === 1 ? balance : groupBalance) < tokenCount
    ) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'tokenCount' });
    }
    const amount = tokenTransferType === 1 ? -tokenCount : tokenCount;
    balance += amount;
    group.tokenBalance = groupBalance - amount;
  },
};
