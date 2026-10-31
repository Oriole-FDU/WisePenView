import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'support-contract-'));

try {
  const outfile = join(tempDir, 'support-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiResponse } from '@/apis/contract';
        export {
          DailyCheckInApiContract,
          ListUserTaskStatusApiContract,
        } from '@/domains/UserTask/apis/UserTaskApi.contract';
        export {
          CompleteTourApiContract,
          ListUserTourStatusApiContract,
        } from '@/domains/User/apis/UserTourApi.contract';
        export {
          ListUserMessagesApiContract,
          ReadMessageApiContract,
        } from '@/domains/Message/apis/MessageApi.contract';
        export {
          GetUserWalletInfoApiContract,
          ListTransactionsApiContract,
          RedeemVoucherApiContract,
          TransferTokenBetweenGroupAndUserApiContract,
        } from '@/domains/Wallet/apis/WalletApi.contract';
        export { ListUserTaskStatusApiContract as TaskContract } from '@/domains/UserTask/apis/UserTaskApi.contract';
        export { ListUserTourStatusApiContract as TourContract } from '@/domains/User/apis/UserTourApi.contract';
        export { ListUserMessagesApiContract as MessageContract } from '@/domains/Message/apis/MessageApi.contract';
        export { ListTransactionsApiContract as WalletContract } from '@/domains/Wallet/apis/WalletApi.contract';
        export { MessageApi } from '@/domains/Message/mock/MessageApi.mock';
        export { UserTaskApi } from '@/domains/UserTask/mock/UserTaskApi.mock';
        export { UserTourApi } from '@/domains/User/mock/UserTourApi.mock';
        export { WalletApi } from '@/domains/Wallet/mock/WalletApi.mock';
      `,
      resolveDir: root,
    },
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    alias: { '@': join(root, 'src') },
  });

  const module = await import(pathToFileURL(outfile).href);
  const {
    CompleteTourApiContract,
    DailyCheckInApiContract,
    GetUserWalletInfoApiContract,
    MessageApi,
    parseApiResponse,
    ReadMessageApiContract,
    RedeemVoucherApiContract,
    TransferTokenBetweenGroupAndUserApiContract,
    UserTaskApi,
    UserTourApi,
    WalletApi,
  } = module;

  const taskStatus = parseApiResponse(module.TaskContract, await UserTaskApi.listTaskStatus());
  assert.equal(taskStatus[0].taskCode, 'DAILY_CHECK_IN');
  assert.equal(typeof taskStatus[0].periodic?.windowStart, 'number');

  const checkIn = parseApiResponse(DailyCheckInApiContract, await UserTaskApi.dailyCheckIn());
  assert.equal(checkIn.rewardType, 'TOKEN');

  const tours = parseApiResponse(module.TourContract, await UserTourApi.listTourStatus());
  assert.equal(tours.length, 5);
  assert.equal(CompleteTourApiContract.requestPlacement, 'query');

  const rawMessages = await MessageApi.listUserMessages({ page: 1, size: 20 });
  const messages = parseApiResponse(module.MessageContract, {
    ...rawMessages,
    total: String(rawMessages.total),
  });
  assert.equal(messages.list[0].messageId, '80001');
  assert.equal(typeof messages.list[0].createTime, 'number');
  assert(
    !ReadMessageApiContract.request.safeParse({
      messageIds: ['mock-message'],
    }).success
  );

  const wallet = parseApiResponse(
    GetUserWalletInfoApiContract,
    await WalletApi.getUserWalletInfo()
  );
  assert.equal(wallet.coinBalance, 0);
  assert.equal(typeof wallet.tokenBalance, 'number');

  const rawTransactions = await WalletApi.listTransactions({ page: 1, size: 20 });
  const transactions = parseApiResponse(module.WalletContract, {
    ...rawTransactions,
    total: String(rawTransactions.total),
  });
  assert.equal(transactions.list[0].walletTransactionType, 'REFILL');
  assert.equal(typeof transactions.list[0].createTime, 'number');

  assert(!RedeemVoucherApiContract.request.safeParse({ voucherCode: '   ' }).success);
  assert(
    !TransferTokenBetweenGroupAndUserApiContract.request.safeParse({
      groupId: '1001',
      tokenCount: 0,
      tokenTransferType: 'GROUP_INFLOW',
    }).success
  );

  console.log('支撑域 API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
