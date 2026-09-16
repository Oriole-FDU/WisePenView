import type { GroupMember } from '@/domains/Group';
import { ROLE } from '@/domains/Group';
import { normalizeId } from '@/utils/normalize/normalizeId';
import {
  normalizeFiniteNumber,
  normalizeNonNegativeNumber,
} from '@/utils/normalize/normalizeNumber';

import type { GroupMemberApiResponse } from '../apis/GroupApi.type';

const normalizeRoleFromApi = (value: unknown): GroupMember['role'] => {
  const numericValue = normalizeFiniteNumber(value);
  if (numericValue == null || numericValue < 0) return 'MEMBER';
  return ROLE.getKey(numericValue) ?? 'MEMBER';
};

/** OpenAPI GroupMemberDetailResponse -> 领域 GroupMember（userId <- memberId） */
export const mapGroupMemberFromApi = (raw: GroupMemberApiResponse): GroupMember => ({
  userId: normalizeId(raw.memberId),
  realname: raw.memberInfo.realName ?? '',
  nickname: raw.memberInfo.nickname,
  campusNo: raw.memberInfo.campusNo ?? undefined,
  email: raw.memberInfo.email ?? undefined,
  role: normalizeRoleFromApi(raw.role),
  joinTime: raw.joinTime,
  avatar: raw.memberInfo.avatar ?? '',
  limit: normalizeNonNegativeNumber(raw.tokenLimit) ?? 0,
  used: normalizeNonNegativeNumber(raw.tokenUsed) ?? 0,
});
