import type { TFunction } from 'i18next';

import type { UserAccountProfile } from '@/domains/User';
import { DEGREE, SEX } from '@/domains/User';
import type { ProfileFieldKey } from '@/views/app/profile/profile.config';

/** 从完整用户信息中取出档案字段原始值；昵称/姓名在 userInfo，其余在 userProfile。 */
function getProfileFieldValue(
  user: UserAccountProfile | null,
  key: ProfileFieldKey
): string | number | null | undefined {
  if (!user) return undefined;
  if (key === 'nickname' || key === 'realName') return user.userInfo[key] ?? undefined;
  return user.userProfile[key] ?? undefined;
}

export type ProfileFieldDisplay = {
  value: string;
  empty: boolean;
};

/**
 * 基本档案只读展示：空值为「未填写」并标记 empty，性别/学历走枚举文案。
 */
export function getProfileFieldDisplay(
  user: UserAccountProfile | null,
  key: ProfileFieldKey,
  t: TFunction<'profile'>
): ProfileFieldDisplay {
  const raw = getProfileFieldValue(user, key);
  if (raw === null || raw === undefined || raw === '') {
    return { value: t('form.emptyValue'), empty: true };
  }
  if (key === 'sex') {
    const enumKey = SEX.getKey(raw as number);
    return {
      value: enumKey ? t(`enum.sex.${enumKey}`) : String(raw),
      empty: false,
    };
  }
  if (key === 'degreeLevel') {
    const enumKey = DEGREE.getKey(raw as number);
    return {
      value: enumKey ? t(`enum.degreeLevel.${enumKey}`) : String(raw),
      empty: false,
    };
  }
  return { value: String(raw), empty: false };
}
