import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'admin-user-contract-'));

try {
  const outfile = join(tempDir, 'admin-user-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          ChangeAdminUserInfoApiContract,
          ChangeAdminUserProfileApiContract,
          FetchAdminUserListApiContract,
          GetAdminUserInfoApiContract,
          ResetAdminUserPasswordApiContract,
        } from '@/domains/Admin/apis/AdminUserApi.contract';
        export { AdminUserServicesMap } from '@/domains/Admin/mapper/AdminUserServices.map';
        export { AdminUserApi } from '@/domains/Admin/mock/AdminUserApi.mock';
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
    AdminUserApi,
    AdminUserServicesMap,
    ChangeAdminUserInfoApiContract,
    ChangeAdminUserProfileApiContract,
    FetchAdminUserListApiContract,
    GetAdminUserInfoApiContract,
    parseApiRequest,
    parseApiResponse,
    ResetAdminUserPasswordApiContract,
  } = await import(pathToFileURL(outfile).href);

  const listRequest = parseApiRequest(FetchAdminUserListApiContract, {
    page: 1,
    size: 20,
    keyword: '',
    userStatus: 'NORMAL',
    identityType: 'STUDENT',
  });
  assert.equal(listRequest.userStatus, 'NORMAL');
  assert(
    !FetchAdminUserListApiContract.request.safeParse({
      page: 1,
      size: 20,
      keyword: '',
      status: 'NORMAL',
    }).success
  );

  const rawUsers = await AdminUserApi.getUserList(listRequest);
  const users = parseApiResponse(FetchAdminUserListApiContract, {
    ...rawUsers,
    total: String(rawUsers.total),
  });
  const mapped = AdminUserServicesMap.mapFetchAdminUserListFromApi(users);
  assert.equal(mapped.users[0].id, '9007199254740993');
  assert.equal(mapped.users[0].status, 'NORMAL');
  assert.equal(typeof mapped.users[0].createTime, 'number');

  const request = parseApiRequest(ChangeAdminUserInfoApiContract, {
    userId: '9007199254740993',
    userStatus: 'BANNED',
    identityType: 2,
  });
  assert.equal(request.userStatus, 'BANNED');
  assert(
    !ChangeAdminUserInfoApiContract.request.safeParse({
      userId: '9007199254740993',
      status: 'BANNED',
    }).success
  );

  const profile = parseApiResponse(
    GetAdminUserInfoApiContract,
    await AdminUserApi.getUserInfo({ userId: '9007199254740993' })
  );
  assert.equal(profile.userId, '9007199254740993');
  assert.equal(typeof profile.updateTime, 'number');

  assert(
    !ResetAdminUserPasswordApiContract.request.safeParse({
      userId: '9007199254740993',
      newPassword: 'short',
    }).success
  );
  assert.equal(ChangeAdminUserProfileApiContract.requestPlacement, 'body');

  console.log('Admin User API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
