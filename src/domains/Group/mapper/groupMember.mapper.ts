import { invalidApiResponse, isApiId, isRecord, optionalApiString } from '@/apis/runtimeContract';
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
export const mapGroupMemberFromApi = (raw: GroupMemberApiResponse): GroupMember => {
  if (
    !isRecord(raw) ||
    !isApiId(raw.memberId) ||
    !isApiId(raw.groupId) ||
    !isRecord(raw.memberInfo) ||
    typeof raw.memberInfo.nickname !== 'string' ||
    !(
      (typeof raw.joinTime === 'string' && raw.joinTime.length > 0) ||
      (typeof raw.joinTime === 'number' && Number.isFinite(raw.joinTime))
    ) ||
    !['0', '1', '2', '-1'].includes(String(raw.role))
  )
    invalidApiResponse('小组成员契约无效');
  return {
    userId: normalizeId(raw.memberId),
    realname: optionalApiString(raw.memberInfo.realName) ?? '',
    nickname: raw.memberInfo.nickname,
    campusNo: optionalApiString(raw.memberInfo.campusNo),
    email: optionalApiString(raw.memberInfo.email),
    role: normalizeRoleFromApi(raw.role),
    joinTime: String(raw.joinTime),
    avatar: optionalApiString(raw.memberInfo.avatar) ?? '',
    limit: normalizeNonNegativeNumber(raw.tokenLimit) ?? 0,
    used: normalizeNonNegativeNumber(raw.tokenUsed) ?? 0,
  };
};
