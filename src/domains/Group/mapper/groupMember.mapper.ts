import type { GroupMember } from '@/domains/Group';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';

import type { GroupMemberApiResponse } from '../apis/GroupApi.type';

const normalizeRoleFromApi = (value: GroupMemberApiResponse['role']): GroupMember['role'] => {
  if (value === 'OWNER') return 'OWNER';
  if (value === 'ADMIN') return 'ADMIN';
  return 'MEMBER';
};

/** OpenAPI GroupMemberDetailResponse -> 领域 GroupMember（userId <- memberId） */
export const mapGroupMemberFromApi = (raw: GroupMemberApiResponse): GroupMember => {
  const memberId = normalizeId(raw.memberId);
  return {
    userId: memberId,
    realname: raw.memberInfo?.realName ?? '',
    nickname: raw.memberInfo?.nickname ?? memberId,
    campusNo: raw.memberInfo?.campusNo ?? undefined,
    email: raw.memberInfo?.email ?? undefined,
    role: normalizeRoleFromApi(raw.role),
    joinTime: raw.joinTime,
    avatar: raw.memberInfo?.avatar ?? '',
    limit: normalizeNonNegativeNumber(raw.tokenLimit) ?? 0,
    used: normalizeNonNegativeNumber(raw.tokenUsed) ?? 0,
  };
};
