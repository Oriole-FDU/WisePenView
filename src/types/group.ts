export const ROLE_MAP: Record<string, number> = { OWNER: 1, ADMIN: 2, MEMBER: 3 };
export const ROLE_REVERSE_MAP: Record<number, string> = { 1: 'OWNER', 2: 'ADMIN', 3: 'MEMBER' };

/** 角色文案（供 TableConfig、PermissionConfigPreview 等复用） */
export const ROLE_LABEL: Record<string, string> = {
  MEMBER: '成员',
  ADMIN: '管理员',
  OWNER: '组长',
};

/** 后端 /group/member/list 返回的成员项结构（与 OpenAPI 一致） */
export interface GroupMember {
  userId: number;
  realname: string;
  nickname: string;
  role: number;
  joinTime: string;
  avatar: string;
  limit?: number;
  used?: number;
}

/** 后端 /group/member/list 分页响应结构 */
export interface MemberListPage {
  total: number;
  page: number;
  size: number;
  totalPage: number;
  list: GroupMember[];
}

/** 后端 /group/info 返回的 creator 结构 */
export interface GroupCreator {
  avatar?: string;
  name?: string;
  nickname?: string;
}

/** 后端返回的小组结构（与 OpenAPI /group/info 一致） */
export interface Group {
  id: number;
  name: string;
  creator: GroupCreator;
  description: string;
  type: number;
  coverUrl: string;
  inviteCode: string;
  memberCount: number;
  createTime?: string;
}
