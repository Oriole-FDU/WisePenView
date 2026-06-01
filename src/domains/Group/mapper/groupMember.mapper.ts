import type { GroupMember } from '@/domains/Group';
import { ROLE } from '@/domains/Group';
import type { GroupMemberRawResponse } from '../service/index.type';

/** OpenAPI GroupMemberDetailResponse -> 领域 GroupMember（userId <- memberId） */
export const mapGroupMemberRawResponse = (raw: GroupMemberRawResponse): GroupMember => ({
  userId: raw.memberId,
  realname: raw.memberInfo.realName ?? '',
  nickname: raw.memberInfo.nickname,
  role: ROLE.getKey(raw.role) ?? 'MEMBER',
  joinTime: raw.joinTime,
  avatar: raw.memberInfo.avatar ?? '',
  limit: raw.tokenLimit,
  used: raw.tokenUsed,
});
