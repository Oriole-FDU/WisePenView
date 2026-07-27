import type { UserAccountProfile } from '@/domains/User';
import { DEGREE, SEX } from '@/domains/User';
import type { ProfileFieldKey } from '@/views/app/profile/profile.config';
import type { TFunction } from 'i18next';

/** 从完整用户信息中取出档案字段原始值；昵称/姓名在 userInfo，其余在 userProfile。 */
function getProfileFieldValue(
  user: UserAccountProfile | null,
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
  user: UserAccountProfile | null,
  key: ProfileFieldKey,
  t: TFunction<'profile'>
): string {
  const raw = getProfileFieldValue(user, key);
  if (raw === null || raw === undefined || raw === '') return '-';
  if (key === 'sex') {
    const enumKey = SEX.getKey(raw as number);
    return enumKey ? t(`enum.sex.${enumKey}`) : String(raw);
  }
  if (key === 'degreeLevel') {
    const enumKey = DEGREE.getKey(raw as number);
    return enumKey ? t(`enum.degreeLevel.${enumKey}`) : String(raw);
  }
  return String(raw);
}
