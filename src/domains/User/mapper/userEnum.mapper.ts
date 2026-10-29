import type { UserDisplayBaseApiResponse, UserIdentityTypeApiValue } from '../apis/UserApi.type';
import type { UserDisplayBase } from '../entity/user';

export const normalizeIdentityTypeFromApi = (value: UserIdentityTypeApiValue): number =>
  Number(value);

export const mapIdentityTypeToApi = (value: number | undefined): string | undefined =>
  value == null ? undefined : String(value);

export const normalizeUserDisplayBaseFromApi = (
  value: UserDisplayBaseApiResponse | null | undefined
): UserDisplayBase | undefined => {
  if (value == null) return undefined;
  return {
    nickname: value.nickname ?? undefined,
    realName: value.realName ?? undefined,
    avatar: value.avatar ?? undefined,
    identityType:
      value.identityType == null ? undefined : normalizeIdentityTypeFromApi(value.identityType),
  };
};
