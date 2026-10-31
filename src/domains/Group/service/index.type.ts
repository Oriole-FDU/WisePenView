import type { ResourceAction } from '@/domains/_shared/access';
import type {
  Group,
  GroupBaseInfo,
  GroupFileOrgLogic,
  GroupMemberList,
  GroupResConfig,
  GroupType,
  ROLE,
} from '@/domains/Group';
import type { EnumValue } from '@/utils/type/enum';

import type { GroupQuotaInfo, UserGroupQuota } from '../entity/quota';
import type { GroupRoleFilter } from '../enum';

/** GroupService 接口：供依赖注入使用 */
export interface IGroupService {
  fetchUserGroupQuotas(
    page: number,
    pageSize: number
  ): Promise<{ quotas: UserGroupQuota[]; total: number }>;
  fetchGroupQuota(groupId: string): Promise<GroupQuotaInfo>;
  setGroupQuota(params: SetGroupQuotaRequest): Promise<void>;
  fetchGroupList(params: FetchGroupListRequest): Promise<FetchGroupListResponse>;
  fetchGroupBaseInfo(groupId: string): Promise<GroupBaseInfo>;
  fetchGroupInfo(groupId: string): Promise<Group>;
  getGroupWalletInfo(params: GetGroupWalletInfoRequest): Promise<number>;
  /** GET /resource/groupConfig/getConfig；保留后端实际文件组织模式 */
  fetchGroupResConfig(groupId: string): Promise<GroupResConfig>;
  /** POST /resource/groupConfig/changeConfig；仅 OWNER/ADMIN */
  updateGroupResConfig(params: UpdateGroupResConfigRequest): Promise<void>;
  /** POST /group/addGroup，成功时返回 data.groupId */
  createGroup(params: CreateGroupRequest): Promise<string>;
  editGroup(params: EditGroupRequest): Promise<void>;
  deleteGroup(params: DeleteGroupRequest): Promise<void>;
  fetchGroupMembers(groupId: string, page: number, size: number): Promise<GroupMemberList>;
  fetchMyRoleInGroup(groupId: string): Promise<'OWNER' | 'ADMIN' | 'MEMBER'>;
  joinGroup(params: JoinGroupRequest): Promise<void>;
  quitGroup(params: QuitGroupRequest): Promise<void>;
  updateMemberRole(params: UpdateMemberRoleRequest): Promise<void>;
  kickMembers(params: KickMembersRequest): Promise<void>;
}

/** 获取小组列表响应 */
export interface FetchGroupListResponse {
  groups: Group[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
  hasMore: boolean;
}

export interface GetGroupWalletInfoRequest {
  groupId: string;
}

/** 获取小组列表请求参数 */
export interface FetchGroupListRequest {
  groupRoleFilter: GroupRoleFilter;
  groupType?: GroupType;
  page: number;
  size: number;
}

/** 创建小组请求参数；基础字段与 OpenAPI addGroup 对齐 */
export interface CreateGroupRequest {
  groupName: string;
  groupType: GroupType;
  groupDesc: string;
  groupCoverUrl?: string;
  groupMetaInfo?: Record<string, unknown>;
}

/** 编辑小组请求参数（与 OpenAPI changeGroup 对齐）；groupId 用 string 避免大数精度丢失 */
export interface EditGroupRequest {
  groupId: string;
  groupName: string;
  groupDesc: string;
  groupCoverUrl: string;
  groupMetaInfo?: Record<string, unknown>;
  groupType: GroupType;
}

/** 解散小组请求参数 */
export interface DeleteGroupRequest {
  groupId: string;
}

/** 加入小组请求参数 */
export interface JoinGroupRequest {
  inviteCode: string;
}

/** 退出小组请求参数 */
export interface QuitGroupRequest {
  groupId: string;
}

/** 修改成员角色请求参数（与 OpenAPI changeRole 对齐）；ID 用 string 避免大数精度丢失 */
export interface UpdateMemberRoleRequest {
  groupId: string;
  targetUserIds: string[];
  role: EnumValue<typeof ROLE>;
}

/** 批量踢出成员请求参数 */
export interface KickMembersRequest {
  groupId: string;
  targetUserIds: string[];
}

/** 设置小组资源配置（与 OpenAPI GroupResConfigUpdateRequest 对齐） */
export interface UpdateGroupResConfigRequest {
  groupId: string;
  fileOrgLogic: GroupFileOrgLogic;
  defaultMemberActions?: ResourceAction[];
}

/** 设置成员配额请求参数（与 OpenAPI changeTokenLimit 对齐）；ID 用 string 避免大数精度丢失 */
export interface SetGroupQuotaRequest {
  groupId: string;
  targetUserIds: string[];
  newTokenLimit: number;
}
