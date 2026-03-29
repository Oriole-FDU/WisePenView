/**
 * 钱包 Mock：供 vite MODE === 'mock' 时本地演示充值与流水筛选。
 *
 * 联调约定（便于手工验错）：
 * - 兑换码全 0：模拟「点卡已使用」
 * - 兑换码全 F：模拟「无效兑换码」
 * - 其它任意 16 位：成功（与真实接口一致不返回 data），本地仍更新余额与流水列表
 */
import type { IWalletService } from '@/services/Wallet';
import type { WalletTransactionRecord } from '@/types/wallet';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let mockTokenBalance = Number(mockdata.tokenBalance) || 0;
let mockTokenUsed = Number(mockdata.tokenUsed) || 0;
const allRecords = [...(mockdata.transactions.records as WalletTransactionRecord[])];

const getWalletInfo: IWalletService['getWalletInfo'] = async () => {
  await delay(280);
  return {
    tokenBalance: mockTokenBalance,
    tokenUsed: mockTokenUsed,
    balance: mockTokenBalance,
  };
};

const redeemVoucher: IWalletService['redeemVoucher'] = async (params) => {
  await delay(400);
  const code = params.code.replace(/[\s-]/g, '').toUpperCase();
  if (code.length !== 16) {
    throw new Error('请输入 16 位兑换码');
  }
  if (code === '0000000000000000') {
    throw new Error('点卡已使用');
  }
  if (code === 'FFFFFFFFFFFFFFFF') {
    throw new Error('无效兑换码');
  }
  const amount = 500;
  mockTokenBalance += amount;
  const traceId = `mock-${Date.now()}`;
  allRecords.unshift({
    traceId,
    time: new Date().toISOString().slice(0, 19).replace('T', ' '),
    type: 'RECHARGE',
    amount,
    title: '点卡充值',
    subTitle: `****${code.slice(-4)}`,
    operatorName: '我',
  });
};

const listTransactions: IWalletService['listTransactions'] = async (params) => {
  await delay(260);
  const { page = 1, size = 20, type: typeParam } = params;
  const type = typeParam ?? 0;
  let rows = [...allRecords];
  // type 0：全部；1 / 2 见筛选分支
  if (type === 1) {
    rows = rows.filter((r) => r.type === 'RECHARGE');
  } else if (type === 2) {
    rows = rows.filter((r) => r.type === 'SPEND');
  }
  const start = (page - 1) * size;
  const slice = rows.slice(start, start + size);
  return { total: rows.length, records: slice };
};

const giveTokenToGroup: IWalletService['giveTokenToGroup'] = async () => {
  await delay(200);
};

const giveTokenToOwner: IWalletService['giveTokenToOwner'] = async () => {
  await delay(200);
};

export const WalletServicesMock: IWalletService = {
  getWalletInfo,
  redeemVoucher,
  listTransactions,
  giveTokenToGroup,
  giveTokenToOwner,
};
