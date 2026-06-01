import type { GROUP_FILE_ORG_LOGIC, ROLE } from '@/domains/Group';
import type { TagResourceAction } from '@/domains/Tag';
import type { EnumKey, EnumValue } from '@/utils/enum';

/** 成员列表领域模型（由 OpenAPI GroupMemberDetailResponse 映射）；userId 对应接口 memberId，避免大数精度丢失 */
export interface GroupMember {
  userId: string;
  realname: string;
  nickname: string;
  /** 组内角色（由接口数字角色码经 ROLE.getKey 映射） */
  role: EnumKey<typeof ROLE>;
  joinTime: string;
  avatar: string;
  limit?: number;
  used?: number;
}

/** 成员列表分页（领域层，由 GET /group/member/list 的 data 映射） */
export interface GroupMemberList {
  members: GroupMember[];
  total: number;
}

/** OpenAPI UserDisplayBase，创建者/成员展示信息 */
export interface GroupOwnerInfo {
  nickname: string;
  realName?: string;
  avatar?: string;
  identityType?: number;
}

/** 小组文件组织模式（与 OpenAPI GroupResConfigResponse.fileOrgLogic 对齐） */
export type GroupFileOrgLogic = EnumValue<typeof GROUP_FILE_ORG_LOGIC>;

/** 小组资源配置（与 OpenAPI GroupResConfigResponse 对齐） */
export interface GroupResConfig {
  groupId: string;
  fileOrgLogic: GroupFileOrgLogic;
  defaultMemberActions?: TagResourceAction[];
}

/** 小组结构（与 OpenAPI GroupDetailInfoResponse/GroupItemInfoResponse 对齐） */
export interface Group {
  groupId: string;
  groupName: string;
  groupDesc: string;
  groupCoverUrl: string;
  groupType: number;
  ownerId?: string;
  ownerInfo?: GroupOwnerInfo;
  memberCount: number;
  createTime?: string;
  inviteCode?: string;
  tokenUsed?: number;
  tokenBalance?: number;
}
