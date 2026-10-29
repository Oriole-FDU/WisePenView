import type { GroupMember } from '@/domains/Group';
import { ROLE } from '@/domains/Group';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { GroupMemberDetailApi } from '../apis/GroupApi.schema';

const mapRoleFromApi = (value: GroupMemberDetailApi['role']): GroupMember['role'] => {
  const role = ROLE.getOption(value);
  if (!role) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
  return role.key;
};

/** OpenAPI GroupMemberDetailResponse -> 领域 GroupMember（userId <- memberId） */
export const mapGroupMemberFromApi = (raw: GroupMemberDetailApi): GroupMember => ({
  userId: raw.memberId,
  realname: raw.memberInfo?.realName ?? '',
  nickname: raw.memberInfo?.nickname ?? '',
  campusNo: raw.memberInfo?.campusNo ?? undefined,
  email: raw.memberInfo?.email ?? undefined,
  role: mapRoleFromApi(raw.role),
  joinTime: new Date(raw.joinTime).toISOString(),
  avatar: raw.memberInfo?.avatar ?? '',
  limit: raw.tokenLimit,
  used: raw.tokenUsed,
});
