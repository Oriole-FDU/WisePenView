import {
  USER_VERIFICATION,
  USER_VERIFICATION_PROVIDER,
  type UserVerificationMode,
} from '@/domains/User';

const VERIFICATION_MODE_LABEL_KEY = {
  [USER_VERIFICATION.EDU_EMAIL]: 'header.verification.EDU_EMAIL',
  [USER_VERIFICATION.CAMPUS_IDENTITY_PROVIDER]: 'header.verification.CAMPUS_IDENTITY_PROVIDER',
} as const satisfies Record<UserVerificationMode, string>;

export type VerificationLabelKey =
  | (typeof VERIFICATION_MODE_LABEL_KEY)[UserVerificationMode]
  | 'header.verification.verified'
  | 'header.verificationProvider.FUDAN_UIS';

export function resolveVerificationLabelKey(
  mode: UserVerificationMode | null,
  provider: string | null
): VerificationLabelKey {
  if (!mode) return 'header.verification.verified';
  // API 新增认证方式时先显示通用已认证文案，避免把未翻译的枚举键直接暴露给用户。
  if (!USER_VERIFICATION.isValue(mode)) return 'header.verification.verified';
  if (
    mode === USER_VERIFICATION.CAMPUS_IDENTITY_PROVIDER &&
    provider === USER_VERIFICATION_PROVIDER.FUDAN_UIS
  ) {
    return 'header.verificationProvider.FUDAN_UIS';
  }
  return VERIFICATION_MODE_LABEL_KEY[mode];
}
