import type { Group, GroupMember } from '@/types/group';

/** GroupService 接口：供依赖注入使用 */
export interface IGroupService {
  fetchGroupList(params: FetchGroupListRequest): Promise<{ groups: Group[]; total: number }>;
  fetchGroupInfo(groupId: string): Promise<Group>;
  createGroup(params: CreateGroupRequest): Promise<void>;
  editGroup(params: EditGroupRequest): Promise<void>;
  deleteGroup(params: DeleteGroupRequest): Promise<void>;
  fetchGroupMembers(
    groupId: string | number,
    page: number,
    size: number
  ): Promise<{ members: GroupMember[]; total: number }>;
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

/** 获取小组列表请求参数 */
export interface FetchGroupListRequest {
  relationType: 1 | 2;
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

/** 编辑小组请求参数（与 OpenAPI changeGroup 对齐） */
export interface EditGroupRequest {
  groupId: number;
  groupName: string;
  groupDesc: string;
  groupCoverUrl: string;
  groupType: number;
}

/** 解散小组请求参数 */
export interface DeleteGroupRequest {
  groupId: number;
}

/** 加入小组请求参数 */
export interface JoinGroupRequest {
  inviteCode: string;
}

/** 退出小组请求参数 */
export interface QuitGroupRequest {
  groupId: number;
}

/** 修改成员角色请求参数（与 OpenAPI changeRole 对齐） */
export interface UpdateMemberRoleRequest {
  groupId: number;
  targetUserIds: number[];
  role: number;
}

/** 批量踢出成员请求参数 */
export interface KickMembersRequest {
  groupId: number;
  targetUserIds: number[];
}
