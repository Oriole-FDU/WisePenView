import type {
  UserDegreeLevelApiValue,
  UserDisplayBaseApiResponse,
  UserIdentityTypeApiValue,
  UserSexApiValue,
  UserStatusApiValue,
} from '../apis/UserApi.type';
import type { UserDisplayBase } from '../entity/user';
import { DEGREE, type DegreeLevel, SEX, USER_STATUS } from '../enum';

export const normalizeIdentityTypeFromApi = (value: UserIdentityTypeApiValue): number =>
  Number(value);

export const normalizeUserStatusFromApi = (value: UserStatusApiValue): number => {
  if (value === 'NORMAL') return USER_STATUS.NORMAL;
  if (value === 'BANNED') return USER_STATUS.BANNED;
  return USER_STATUS.UNVERIFIED;
};

export const normalizeSexFromApi = (value: UserSexApiValue): number => SEX.values[value];

export const normalizeDegreeLevelFromApi = (value: UserDegreeLevelApiValue): DegreeLevel =>
  DEGREE.values[value] as DegreeLevel;

export const mapIdentityTypeToApi = (value: number | undefined): string | undefined =>
  value == null ? undefined : String(value);

export const mapUserStatusToApi = (value: number | undefined): string | undefined => {
  if (value == null) return undefined;
  const key = USER_STATUS.getKey(value);
  if (key === 'NORMAL') return 'NORMAL';
  if (key === 'BANNED') return 'BANNED';
  if (key === 'UNVERIFIED') return 'UNIDENTIFIED';
  return undefined;
};

export const mapSexToApi = (value: number | undefined): string | undefined =>
  value == null ? undefined : SEX.getKey(value);

export const mapDegreeLevelToApi = (value: number | undefined): string | undefined =>
  value == null ? undefined : DEGREE.getKey(value);

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
