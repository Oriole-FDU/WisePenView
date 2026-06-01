import type { Group, GroupFileOrgLogic, GroupMemberList, GroupResConfig } from '@/domains/Group';
import type { TagResourceAction } from '@/domains/Tag';

/** GroupService 接口：供依赖注入使用 */
export interface IGroupService {
  fetchGroupList(params: FetchGroupListRequest): Promise<{ groups: Group[]; total: number }>;
  fetchGroupInfo(groupId: string): Promise<Group>;
  getGroupWalletInfo(params: GetGroupWalletInfoRequest): Promise<number>;
  /** GET /resource/groupConfig/getConfig；查不到时后端默认 FOLDER */
  fetchGroupResConfig(groupId: string): Promise<GroupResConfig>;
  /** POST /resource/groupConfig/changeConfig；仅 OWNER/ADMIN */
  updateGroupResConfig(params: UpdateGroupResConfigRequest): Promise<void>;
  /** POST /group/addGroup，成功时返回 data.groupId */
  createGroup(params: CreateGroupRequest): Promise<string>;
  editGroup(params: EditGroupRequest): Promise<void>;
  deleteGroup(params: DeleteGroupRequest): Promise<void>;
  fetchGroupMembers(groupId: string | number, page: number, size: number): Promise<GroupMemberList>;
  fetchMyRoleInGroup(groupId: string): Promise<'OWNER' | 'ADMIN' | 'MEMBER'>;
  joinGroup(params: JoinGroupRequest): Promise<void>;
  quitGroup(params: QuitGroupRequest): Promise<void>;
  updateMemberRole(params: UpdateMemberRoleRequest): Promise<void>;
  kickMembers(params: KickMembersRequest): Promise<void>;
}

/** 获取小组列表响应 */
export interface FetchGroupListResponse {
  total: number;
  list: Group[];
}

export interface GetGroupWalletInfoRequest {
  groupId: string;
}

export interface GroupMemberBaseInfo {
  nickname: string;
  realName: string | null;
  avatar: string | null;
  identityType: number;
}

export interface GroupMemberRawResponse {
  role: number;
  joinTime: string;
  tokenLimit: number;
  tokenUsed: number;
  groupId: string;
  memberId: string;
  memberInfo: GroupMemberBaseInfo;
}

/** GET /group/member/list 的 data */
export interface FetchGroupMembersResponse {
  total: string;
  page: number;
  size: number;
  totalPage: number;
  list: GroupMemberRawResponse[];
}

/** 获取小组列表请求参数 */
export interface FetchGroupListRequest {
  groupRoleFilter: 'JOINED' | 'MANAGED';
  page: number;
  size: number;
}

/** 创建小组请求参数（与 OpenAPI addGroup 对齐） */
export interface CreateGroupRequest {
  groupName: string;
  groupType: number;
  groupDesc: string;
  groupCoverUrl?: string;
}

/** 编辑小组请求参数（与 OpenAPI changeGroup 对齐）；groupId 用 string 避免大数精度丢失 */
export interface EditGroupRequest {
  groupId: string;
  groupName: string;
  groupDesc: string;
  groupCoverUrl: string;
  groupType: number;
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
  role: number;
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
  defaultMemberActions?: TagResourceAction[];
}
