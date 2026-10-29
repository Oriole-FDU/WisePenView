import {
  normalizeResourceActions,
  RESOURCE_ACTION,
  type ResourceAction,
} from '@/domains/_shared/access';
import type { EnumValue } from '@/utils/type/enum';
import { defineEnum } from '@/utils/type/enum';

/** 小组类型 */
export const GROUP_TYPE = defineEnum({ NORMAL: 1, ADVANCED: 2, PUBLIC: 3 } as const);
export type GroupType = EnumValue<typeof GROUP_TYPE>;

/** 当前用户与小组的关系筛选 */
export const GROUP_ROLE_FILTER_MAP: Record<string, 'ALL' | 'JOINED' | 'MANAGED'> = {
  all: 'ALL',
  joined: 'JOINED',
  managed: 'MANAGED',
};

/** 小组成员角色码：0=OWNER，1=ADMIN，2=MEMBER（与后端约定一致） */
export const ROLE = defineEnum({ OWNER: 0, ADMIN: 1, MEMBER: 2 } as const);

/** 小组文件组织模式（与后端 FileOrganizationLogic enum name 对齐） */
export const GROUP_FILE_ORG_LOGIC = defineEnum(['FOLDER', 'TAG'] as const);

export const DEFAULT_MEMBER_ACTIONS: ResourceAction[] = normalizeResourceActions([
  RESOURCE_ACTION.EDIT,
  RESOURCE_ACTION.INLINE_COMMENT,
  RESOURCE_ACTION.DOWNLOAD_WATERMARK,
  RESOURCE_ACTION.FORK,
  RESOURCE_ACTION.COMMENT,
]);
