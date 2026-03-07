import type { Group } from '@/types/group';

/** 获取小组列表响应 */
export interface FetchGroupListResponse {
  total: number;
  list: Group[];
}

/** 获取小组列表请求参数 */
export interface FetchGroupListRequest {
  relationType: 1 | 2;
  page: number;
  pageSize: number;
}

/** 创建小组请求参数 */
export interface CreateGroupRequest {
  groupName: string;
  description: string;
  groupType: number;
}

/** 编辑小组请求参数 */
export interface EditGroupRequest {
  groupId: string;
  groupName: string;
  description: string;
  coverUrl?: string;
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

/** 修改成员角色请求参数 */
export interface UpdateMemberRoleRequest {
  groupId: number;
  targetUserId: number;
  role: number;
}

/** 批量踢出成员请求参数 */
export interface KickMembersRequest {
  groupId: number;
  targetUserIds: number[];
}
