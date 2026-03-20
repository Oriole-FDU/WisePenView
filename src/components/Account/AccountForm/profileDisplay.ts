import { getDegreeLevelLabel, getSexLabel } from '@/constants/user';
import type { GetUserInfoResponse } from '@/services/User';
import type { ProfileFieldKey } from '@/views/profile/profile.config';

/** 从完整用户信息中取出档案字段原始值；昵称/姓名在 userInfo，其余在 userProfile。 */
function getProfileFieldValue(
  user: GetUserInfoResponse | null,
  key: ProfileFieldKey
): string | number | null | undefined {
  if (!user) return undefined;
  if (key === 'nickname' || key === 'realName') return user.userInfo[key] ?? undefined;
  return user.userProfile[key] ?? undefined;
}

/**
 * 基本档案只读展示用文案：空值为「-」，性别/学历走枚举中文，其余 `String`。
 */
export function getProfileDisplayString(
  user: GetUserInfoResponse | null,
  key: ProfileFieldKey
): string {
  const raw = getProfileFieldValue(user, key);
  if (raw === null || raw === undefined || raw === '') return '-';
  if (key === 'sex') return getSexLabel(raw as number);
  if (key === 'degreeLevel') return getDegreeLevelLabel(raw as number);
  return String(raw);
}
