import type {
  UserDisplayBaseApiResponse,
  UserIdentityTypeApiValue,
} from '@/domains/User/apis/UserApi.type';

/** 构造完整的最小用户展示响应，避免 mock 漏掉后端固定返回的字段。 */
export const createMockUserDisplay = (
  overrides: Partial<UserDisplayBaseApiResponse> = {}
): UserDisplayBaseApiResponse => ({
  nickname: '示例用户',
  username: 'mock-user',
  realName: null,
  avatar: null,
  identityType: 'STUDENT' satisfies UserIdentityTypeApiValue,
  campusNo: null,
  email: null,
  mobile: null,
  ...overrides,
});
