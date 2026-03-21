/** 小组类型 */
export const GROUP_TYPE = { NORMAL: 1, ADVANCED: 2, PUBLIC: 3 } as const;
export const GROUP_TYPE_LABELS: Record<number, string> = {
  1: '普通组',
  2: '高级组',
  3: '集市组',
};
export const getGroupTypeLabel = (v: number) => GROUP_TYPE_LABELS[v] ?? String(v);

/** 关系类型（我加入的 / 我管理的） */
export const RELATION_TYPE_MAP: Record<string, 0 | 1> = {
  managed: 0,
  joined: 1,
};

/** 小组成员角色（与 OpenAPI 角色码 1/2/3 对齐） */
export const ROLE_MAP: Record<string, number> = { OWNER: 1, ADMIN: 2, MEMBER: 3 };
export const ROLE_REVERSE_MAP: Record<number, string> = { 1: 'OWNER', 2: 'ADMIN', 3: 'MEMBER' };

/** /group/member/my-role 接口专用：该接口返回的角色码为 0-OWNER, 1-ADMIN, 2-MEMBER，与 ROLE_MAP/ROLE_REVERSE_MAP(1/2/3) 不同 */
export const API_MY_ROLE_MAP: Record<number, 'OWNER' | 'ADMIN' | 'MEMBER'> = {
  0: 'OWNER',
  1: 'ADMIN',
  2: 'MEMBER',
};

/** 角色文案（供 TableConfig 等复用） */
export const ROLE_LABEL: Record<string, string> = {
  MEMBER: '成员',
  ADMIN: '管理员',
  OWNER: '组长',
};

/** 身份类型 → 可创建的小组类型列表 */
export const ALLOWED_GROUP_TYPES_MAP: Record<number, number[]> = {
  1: [GROUP_TYPE.NORMAL],
  2: [GROUP_TYPE.NORMAL, GROUP_TYPE.ADVANCED],
  3: [GROUP_TYPE.NORMAL, GROUP_TYPE.ADVANCED, GROUP_TYPE.PUBLIC],
};
