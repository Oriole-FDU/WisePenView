import type { UserDisplayApi } from '../apis/UserInformationApi.schema';
import type { UserDisplayBase } from '../entity/user';

export const normalizeUserDisplayBaseFromApi = (
  value: Partial<UserDisplayApi> | null | undefined
): UserDisplayBase | undefined => {
  if (value == null) return undefined;
  return {
    nickname: value.nickname ?? undefined,
    realName: value.realName ?? undefined,
    avatar: value.avatar ?? undefined,
    identityType: value.identityType ?? undefined,
  };
};
