import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'account-contract-'));

try {
  const outfile = join(tempDir, 'account-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          ChangeUserInfoApiContract,
          ChangeUserProfileApiContract,
          CheckEmailVerifyApiContract,
          CheckFudanUISVerifyApiContract,
          InitiateEmailVerifyApiContract,
          InitiateFudanUISVerifyApiContract,
          ListUserInviteRecordsApiContract,
        } from '@/domains/User/apis/AccountApi.contract';
        export { AddFeedbackApiContract } from '@/domains/Feedback/apis/FeedbackApi.contract';
        export { FeedbackApi } from '@/domains/Feedback/mock/FeedbackApi.mock';
        export { UserServicesMap } from '@/domains/User/mapper/UserServices.map';
        export { UserApi } from '@/domains/User/mock/UserApi.mock';
      `,
      resolveDir: root,
    },
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    alias: { '@': join(root, 'src') },
  });

  const {
    AddFeedbackApiContract,
    ChangeUserInfoApiContract,
    ChangeUserProfileApiContract,
    CheckEmailVerifyApiContract,
    CheckFudanUISVerifyApiContract,
    FeedbackApi,
    InitiateEmailVerifyApiContract,
    InitiateFudanUISVerifyApiContract,
    ListUserInviteRecordsApiContract,
    parseApiRequest,
    parseApiResponse,
    UserApi,
    UserServicesMap,
  } = await import(pathToFileURL(outfile).href);

  const contracts = [
    AddFeedbackApiContract,
    ChangeUserInfoApiContract,
    ChangeUserProfileApiContract,
    CheckEmailVerifyApiContract,
    CheckFudanUISVerifyApiContract,
    InitiateEmailVerifyApiContract,
    InitiateFudanUISVerifyApiContract,
    ListUserInviteRecordsApiContract,
  ];
  assert.equal(new Set(contracts.map((contract) => contract.endpoint)).size, 8);

  assert(!InitiateEmailVerifyApiContract.request.safeParse({ email: 'not-an-email' }).success);
  assert(
    ChangeUserProfileApiContract.request.safeParse({
      university: null,
      enrollmentYear: 2024,
      degreeLevel: 'UNDERGRADUATE',
    }).success
  );
  assert(
    !ChangeUserProfileApiContract.request.safeParse({
      degreeLevel: 'BACHELOR',
    }).success
  );

  const feedbackRequest = parseApiRequest(AddFeedbackApiContract, {
    content: '提交反馈',
    contact: 'test@example.com',
    type: 'BUG_REPORT',
    browser: 'test-browser',
  });
  await FeedbackApi.addFeedback(feedbackRequest);
  assert.equal(feedbackRequest.type, 'BUG_REPORT');
  assert(
    !AddFeedbackApiContract.request.safeParse({
      content: '旧契约',
      contact: 'test@example.com',
      bugReport: true,
      suggestion: false,
      consultation: false,
      complaint: false,
      other: false,
    }).success
  );

  const fudanStatus = parseApiResponse(
    CheckFudanUISVerifyApiContract,
    await UserApi.checkFudanUISVerify()
  );
  assert.equal(fudanStatus.completed, false);
  assert.equal(typeof fudanStatus.requireAction, 'boolean');

  const inviteRecords = parseApiResponse(ListUserInviteRecordsApiContract, {
    ...(await UserApi.listInviteRecords({ page: 1, size: 20 })),
    total: '2',
  });
  const mappedInvites = UserServicesMap.mapListInviteRecordsFromApi(inviteRecords);
  assert.equal(mappedInvites.records.length, 2);
  assert.equal(mappedInvites.records[0].status, 'REWARDED');
  assert.equal(typeof mappedInvites.records[0].createTime, 'number');

  console.log('Account API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
