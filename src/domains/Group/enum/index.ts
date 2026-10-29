import type { TagResourceAction } from '@/domains/Tag';
import { TAG_PERMISSION_PRESET_VALUES } from '@/domains/Tag';
import type { EnumValue } from '@/utils/type/enum';
import { defineEnum } from '@/utils/type/enum';

/** 小组类型 */
export const GROUP_TYPE = defineEnum([
  { value: 1, key: 'NORMAL' },
  { value: 2, key: 'ADVANCED' },
  { value: 3, key: 'PUBLIC' },
] as const);
export type GroupType = EnumValue<typeof GROUP_TYPE>;

/** 当前用户与小组的关系筛选 */
export const GROUP_ROLE_FILTER_MAP: Record<string, 'ALL' | 'JOINED' | 'MANAGED'> = {
  all: 'ALL',
  joined: 'JOINED',
  managed: 'MANAGED',
};

/** 小组成员角色码：0=OWNER，1=ADMIN，2=MEMBER（与后端约定一致） */
export const ROLE = defineEnum([
  { value: 0, key: 'OWNER' },
  { value: 1, key: 'ADMIN' },
  { value: 2, key: 'MEMBER' },
] as const);

/** 小组文件组织模式（与后端 FileOrganizationLogic enum name 对齐） */
export const GROUP_FILE_ORG_LOGIC = defineEnum([
  { value: 'FOLDER', key: 'FOLDER' },
  { value: 'TAG', key: 'TAG' },
] as const);

export const DEFAULT_MEMBER_ACTIONS: TagResourceAction[] = [
  ...TAG_PERMISSION_PRESET_VALUES.shared.grantedActions,
];
