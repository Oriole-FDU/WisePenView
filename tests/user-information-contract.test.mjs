import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'user-information-contract-'));

try {
  const outfile = join(tempDir, 'user-information-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          GetUserInfoApiContract,
          ListUserSearchSuggestionsApiContract,
          SearchUsersApiContract,
        } from '@/domains/User/apis/UserInformationApi.contract';
        export {
          GetUserInfoApiResponseSchema,
          ListUserSearchSuggestionsApiRequestSchema,
          SearchUsersApiRequestSchema,
          UserSearchApiResponseSchema,
          UserSummaryApiSchema,
        } from '@/domains/User/apis/UserInformationApi.schema';
        export { UserServicesMap } from '@/domains/User/mapper/UserServices.map';
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
    GetUserInfoApiContract,
    GetUserInfoApiResponseSchema,
    ListUserSearchSuggestionsApiContract,
    ListUserSearchSuggestionsApiRequestSchema,
    parseApiRequest,
    parseApiResponse,
    SearchUsersApiContract,
    SearchUsersApiRequestSchema,
    UserSearchApiResponseSchema,
    UserServicesMap,
    UserSummaryApiSchema,
  } = await import(pathToFileURL(outfile).href);

  for (const contract of [
    GetUserInfoApiContract,
    SearchUsersApiContract,
    ListUserSearchSuggestionsApiContract,
  ]) {
    assert.equal(contract.method, 'GET');
    assert.equal(contract.transport, 'json');
  }
  assert.equal(GetUserInfoApiContract.requestPlacement, 'none');
  assert.equal(SearchUsersApiContract.requestPlacement, 'query');
  assert.equal(ListUserSearchSuggestionsApiContract.requestPlacement, 'query');
  assert.equal(parseApiRequest(GetUserInfoApiContract, undefined), undefined);

  assert.deepEqual(parseApiRequest(SearchUsersApiContract, { keyword: '  alice  ' }), {
    keyword: 'alice',
  });
  assert(!SearchUsersApiRequestSchema.safeParse({ keyword: '   ' }).success);
  assert(!SearchUsersApiRequestSchema.safeParse({ keyword: 'a'.repeat(129) }).success);
  assert(!SearchUsersApiRequestSchema.safeParse({ keyword: 'alice', ignored: true }).success);

  assert.deepEqual(
    parseApiRequest(ListUserSearchSuggestionsApiContract, {
      keyword: ' al ',
      size: 20,
    }),
    { keyword: 'al', size: 20 }
  );
  assert(ListUserSearchSuggestionsApiRequestSchema.safeParse({ keyword: 'al' }).success);
  assert(!ListUserSearchSuggestionsApiRequestSchema.safeParse({ keyword: 'a' }).success);
  assert(
    !ListUserSearchSuggestionsApiRequestSchema.safeParse({ keyword: 'alice', size: 0 }).success
  );
  assert(
    !ListUserSearchSuggestionsApiRequestSchema.safeParse({ keyword: 'alice', size: 21 }).success
  );
  assert(
    !ListUserSearchSuggestionsApiRequestSchema.safeParse({ keyword: 'alice', size: 2.5 }).success
  );

  const userSummary = {
    userId: '10086',
    username: 'xiaoming',
    nickname: '小明',
    avatar: '',
    identityType: 1,
    realName: '王明',
    email: 'private@example.com',
  };
  const summaryResult = UserSummaryApiSchema.safeParse(userSummary);
  assert(summaryResult.success);
  assert(!Object.hasOwn(summaryResult.data, 'email'));
  assert(!UserSummaryApiSchema.safeParse({ ...userSummary, userId: 10086 }).success);
  assert(!UserSummaryApiSchema.safeParse({ ...userSummary, identityType: '1' }).success);
  assert(!UserSummaryApiSchema.safeParse({ ...userSummary, nickname: undefined }).success);

  const parsedSearch = parseApiResponse(SearchUsersApiContract, [userSummary]);
  assert.equal(parsedSearch[0].userId, '10086');
  assert(!UserSearchApiResponseSchema.safeParse([{ ...userSummary, userId: '0' }]).success);

  const mockCurrentUser = JSON.parse(
    await readFile(join(root, 'src/domains/User/mock/mockdata.json'), 'utf8')
  );
  const currentUserResult = GetUserInfoApiResponseSchema.safeParse(mockCurrentUser);
  assert(currentUserResult.success);
  assert.equal(currentUserResult.data.userInfo.identityType, 3);
  assert.equal(currentUserResult.data.readonlyFields, null);

  const accountProfile = UserServicesMap.mapAccountProfileFromApi(currentUserResult.data);
  assert.equal(accountProfile.userProfile.sex, 'MALE');
  assert.equal(accountProfile.userProfile.degreeLevel, 'UNDERGRADUATE');

  const { userProfilePayload } = UserServicesMap.mapUpdateUserInfoRequests({
    sex: 'FEMALE',
    degreeLevel: 'MASTER',
  });
  assert.equal(userProfilePayload.sex, 'FEMALE');
  assert.equal(userProfilePayload.degreeLevel, 'MASTER');

  assert(
    !GetUserInfoApiResponseSchema.safeParse({
      ...mockCurrentUser,
      userInfo: { ...mockCurrentUser.userInfo, identityType: '3' },
    }).success
  );
  assert(
    !GetUserInfoApiResponseSchema.safeParse({
      ...mockCurrentUser,
      readonlyFields: ['unknownReadonlyField'],
    }).success
  );

  const serializedCurrentUser = JSON.parse(JSON.stringify(mockCurrentUser));
  serializedCurrentUser.userProfile.enrollmentYear = '2023';
  assert(!GetUserInfoApiResponseSchema.safeParse(serializedCurrentUser).success);

  console.log('UserInformation API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
